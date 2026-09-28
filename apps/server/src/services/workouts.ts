import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  exercises,
  planSchema,
  profileSchema,
  sessionSchema,
  metricSchema,
  assessmentSchema,
  type Session,
  type plannedExerciseSchema,
  type updateProfileSchema,
  type updatePlanSchema,
  type startSessionSchema,
  type recordInputSchema,
  type replaceExerciseSchema,
  type restInputSchema,
  type metricInputSchema,
  type assessmentInputSchema,
} from '@heyaz/contracts';
import type { UserStore } from '../db/store.js';
import { ApiError, conflict } from '../errors.js';
import { localDate } from '../time.js';
export const getProfile = (store: UserStore) => store.require('profile', 'current', profileSchema);
export const getPlan = (store: UserStore) => store.require('plan', 'current', planSchema);
export async function saveProfile(store: UserStore, input: z.infer<typeof updateProfileSchema>) {
  const current = await getProfile(store);
  conflict(current.revision, input.baseRevision);
  const { baseRevision, ...fields } = input;
  const profile = { ...fields, onboarded: true, revision: baseRevision + 1 };
  await store.put('profile', 'current', profile);
  return profile;
}
export async function savePlan(
  store: UserStore,
  input: z.infer<typeof updatePlanSchema>,
  now: Date,
) {
  const current = await getPlan(store);
  conflict(current.revision, input.baseRevision);
  const { baseRevision, ...fields } = input;
  const plan = {
    ...current,
    ...fields,
    endDate: fields.endDate,
    createdBy: 'USER' as const,
    revision: baseRevision + 1,
    updatedAt: now.toISOString(),
  };
  await store.put('plan', 'current', plan);
  return plan;
}
export async function startSession(
  store: UserStore,
  input: z.infer<typeof startSessionSchema>,
  now: Date,
) {
  if ((await store.list('session', sessionSchema)).some((s) => s.status === 'active'))
    throw new ApiError(409, 'ACTIVE_SESSION', '진행 중인 운동을 먼저 이어가거나 종료해주세요.');
  const plan = await getPlan(store);
  conflict(plan.revision, input.planRevision);
  const day = plan.days.find((day) => day.id === input.dayId);
  if (!day) throw new ApiError(404, 'DAY_NOT_FOUND', '계획에 해당 운동일이 없습니다.');
  const profile = await getProfile(store);
  const session: Session = {
    id: randomUUID(),
    revision: 1,
    date: localDate(now, profile.timeZone),
    timeZone: profile.timeZone,
    startedAt: now.toISOString(),
    planRevision: plan.revision,
    day: structuredClone(day),
    records: [],
    status: 'active',
  };
  await store.put('session', session.id, session);
  return session;
}
async function active(store: UserStore, id: string, baseRevision: number) {
  const session = await store.require('session', id, sessionSchema);
  conflict(session.revision, baseRevision);
  if (session.status !== 'active')
    throw new ApiError(409, 'SESSION_ENDED', '이미 종료된 운동입니다.');
  return session;
}
async function saveSession(store: UserStore, session: Session) {
  session.revision++;
  await store.put('session', session.id, session);
  return session;
}
export function normalizePlanned(item: z.infer<typeof plannedExerciseSchema>) {
  const exercise = exercises.find((e) => e.id === item.exerciseId)!;
  return {
    ...item,
    reps: exercise.kind === 'timed' ? 0 : Math.max(1, item.reps),
    weight: exercise.equipment === '맨몸' ? 0 : item.weight,
    duration: exercise.kind === 'timed' ? Math.max(1, item.duration) : 30,
  };
}
export async function recordSet(
  store: UserStore,
  id: string,
  input: z.infer<typeof recordInputSchema>,
  now: Date,
) {
  const session = await active(store, id, input.baseRevision);
  const planned = session.day.exercises.find((e) => e.id === input.plannedExerciseId);
  if (!planned) throw new ApiError(404, 'EXERCISE_NOT_FOUND', '이 운동에 속한 항목이 아닙니다.');
  if (input.set > planned.sets)
    throw new ApiError(422, 'SET_LIMIT', '목표 세트 수를 초과했습니다.');
  if (session.records.some((r) => r.plannedExerciseId === planned.id && r.set === input.set))
    throw new ApiError(409, 'SET_ALREADY_RECORDED', '이미 처리한 세트입니다.');
  const nextSet = session.records.filter((r) => r.plannedExerciseId === planned.id).length + 1;
  if (input.set !== nextSet)
    throw new ApiError(409, 'SET_ORDER', '다음 세트부터 순서대로 기록해주세요.');
  const exercise = exercises.find((e) => e.id === planned.exerciseId)!;
  if (input.status === 'completed') {
    if (session.restUntil && Date.parse(session.restUntil) > now.getTime())
      throw new ApiError(409, 'REST_ACTIVE', '휴식 종료 후 기록하거나 휴식을 건너뛰어주세요.');
    if (
      (exercise.kind === 'strength' && (input.reps < 1 || input.duration !== 0)) ||
      (exercise.kind === 'timed' && (input.duration < 1 || input.reps !== 0)) ||
      (exercise.equipment === '맨몸' && input.weight !== 0)
    )
      throw new ApiError(422, 'EXERCISE_VALUES', '운동 유형에 맞는 수행 수치를 입력해주세요.');
  }
  const { baseRevision: _revision, ...record } = input;
  session.records.push({
    ...record,
    ...(input.status === 'skipped' ? { reps: 0, weight: 0, duration: 0, rpe: undefined } : {}),
    id: randomUUID(),
    exerciseId: planned.exerciseId,
    completedAt: now.toISOString(),
  });
  session.restUntil =
    input.status === 'completed'
      ? new Date(now.getTime() + planned.restSeconds * 1000).toISOString()
      : session.restUntil;
  return saveSession(store, session);
}
export async function replaceExercise(
  store: UserStore,
  id: string,
  input: z.infer<typeof replaceExerciseSchema>,
) {
  const session = await active(store, id, input.baseRevision);
  const item = session.day.exercises.find((e) => e.id === input.plannedExerciseId);
  if (!item) throw new ApiError(404, 'EXERCISE_NOT_FOUND', '운동 항목을 찾을 수 없습니다.');
  if (session.records.some((r) => r.plannedExerciseId === item.id))
    throw new ApiError(
      409,
      'EXERCISE_STARTED',
      '완료 또는 스킵 기록이 있는 운동은 교체할 수 없습니다.',
    );
  Object.assign(item, normalizePlanned({ ...item, exerciseId: input.exerciseId }));
  return saveSession(store, session);
}
export async function rest(
  store: UserStore,
  id: string,
  input: z.infer<typeof restInputSchema>,
  now: Date,
) {
  const session = await active(store, id, input.baseRevision);
  session.restUntil =
    input.action === 'skip'
      ? undefined
      : new Date(
          Math.max(now.getTime(), Date.parse(session.restUntil ?? now.toISOString())) + 30000,
        ).toISOString();
  return saveSession(store, session);
}
export async function finishSession(store: UserStore, id: string, baseRevision: number, now: Date) {
  const session = await active(store, id, baseRevision);
  session.status = session.day.exercises.every(
    (e) =>
      session.records.filter((r) => r.plannedExerciseId === e.id && r.status === 'completed')
        .length === e.sets,
  )
    ? 'completed'
    : 'partial';
  session.endedAt = now.toISOString();
  session.restUntil = undefined;
  return saveSession(store, session);
}
export async function saveMetric(
  store: UserStore,
  input: z.infer<typeof metricInputSchema>,
  now: Date,
) {
  const profile = await getProfile(store);
  if (input.date > localDate(now, profile.timeZone))
    throw new ApiError(422, 'FUTURE_DATE', '미래 날짜에는 신체 기록을 저장할 수 없습니다.');
  const previous = await store.get('metric', input.date, metricSchema);
  conflict(previous?.revision ?? 0, input.baseRevision);
  const { baseRevision, ...fields } = input;
  const metric = {
    ...fields,
    id: previous?.id ?? randomUUID(),
    revision: baseRevision + 1,
    height: profile.height,
    bmi: Number((input.weight / (profile.height / 100) ** 2).toFixed(1)),
  };
  await store.put('metric', metric.date, metric);
  return metric;
}
export async function saveAssessment(
  store: UserStore,
  input: z.infer<typeof assessmentInputSchema>,
  now: Date,
) {
  const profile = await getProfile(store);
  const assessment = assessmentSchema.parse({
    ...input,
    id: randomUUID(),
    date: localDate(now, profile.timeZone),
    summary: input.records
      .map((r) => `${exercises.find((e) => e.id === r.exerciseId)!.name} ${r.sets}세트 수행`)
      .join(', '),
  });
  await store.put('assessment', assessment.id, assessment);
  return assessment;
}
