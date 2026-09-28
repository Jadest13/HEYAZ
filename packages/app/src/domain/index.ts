import type { AppState, BurningDaySession, WorkoutPlan, WorkoutSession } from '../types';
import { exerciseById } from '../constants/exercises';
import { localDate, uid } from '../utils/date';
export const volume = (s: WorkoutSession) =>
  s.records.filter((r) => r.status === 'completed').reduce((v, r) => v + r.weight * r.reps, 0);
export const sessionMinutes = (s: WorkoutSession) =>
  Math.max(
    0,
    Math.round(
      ((s.endedAt ? Date.parse(s.endedAt) : Date.now()) - Date.parse(s.startedAt)) / 60000,
    ),
  );
export const calories = (weight: number, minutes: number, met = 4) => ({
  min: Math.round(((weight * met * minutes) / 60) * 0.8),
  max: Math.round(((weight * met * minutes) / 60) * 1.2),
});
export function validatePlan(plan: WorkoutPlan) {
  if (!plan.name.trim() || !plan.days.length) throw new Error('계획 이름과 운동일을 입력해주세요.');
  const seen = new Set<number>();
  for (const d of plan.days) {
    if (seen.has(d.dayOfWeek)) throw new Error('같은 요일은 하나의 운동일로 합쳐주세요.');
    seen.add(d.dayOfWeek);
    if (!d.title.trim() || !d.exercises.length)
      throw new Error('운동일마다 이름과 운동을 추가해주세요.');
    if (
      d.dayOfWeek < 0 ||
      d.dayOfWeek > 6 ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(d.startTime) ||
      d.estimatedDuration < 1 ||
      d.estimatedDuration > 300
    )
      throw new Error('요일, 시작 시간, 운동 시간을 확인해주세요.');
    for (const e of d.exercises) {
      if (![e.sets, e.reps, e.weight, e.duration, e.restSeconds].every(Number.isFinite))
        throw new Error('운동 수치를 입력해주세요.');
      if (
        !Number.isInteger(e.sets) ||
        e.sets < 1 ||
        e.sets > 20 ||
        e.reps < 0 ||
        e.reps > 500 ||
        e.weight < 0 ||
        e.weight > 1000 ||
        e.duration < 1 ||
        e.duration > 7200 ||
        e.restSeconds < 0 ||
        e.restSeconds > 1800
      )
        throw new Error('세트·횟수·중량·시간 범위를 확인해주세요.');
      if (exerciseById(e.exerciseId).kind === 'strength' && e.reps < 1)
        throw new Error('횟수는 1 이상이어야 합니다.');
    }
  }
}
export function applyPlan(state: AppState, plan: WorkoutPlan, baseRevision: number): AppState {
  if (state.plan.revision !== baseRevision)
    throw new Error('계획이 변경되었습니다. 최신 계획에서 다시 제안받아주세요.');
  validatePlan(plan);
  return {
    ...state,
    plan: {
      ...plan,
      id: state.plan.id,
      revision: baseRevision + 1,
      updatedAt: new Date().toISOString(),
    },
  };
}
export function createBurning(
  startTime: string,
  endTime: string,
  interval: number,
  pool: string[],
  random = Math.random,
): BurningDaySession {
  const date = localDate();
  const start = new Date(`${date}T${startTime}`).getTime();
  const end = new Date(`${date}T${endTime}`).getTime();
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    end <= start ||
    !Number.isFinite(interval) ||
    interval < 5 ||
    interval > 240 ||
    !pool.length
  )
    throw new Error('종료 시간은 시작 이후, 간격은 5~240분으로 설정하고 운동을 선택해주세요.');
  const events: BurningDaySession['events'] = [];
  let previous = '';
  for (let at = start; at < end; at += interval * 60000) {
    const weights = pool.map((id) => (id === previous ? 0.1 : 1));
    let cursor = random() * weights.reduce((a, b) => a + b, 0);
    let selected = pool[pool.length - 1];
    for (let i = 0; i < pool.length; i++) {
      cursor -= weights[i];
      if (cursor < 0) {
        selected = pool[i];
        break;
      }
    }
    previous = selected;
    events.push({
      id: uid(),
      scheduledAt: at,
      exerciseId: selected,
      reps: 15,
      duration: 30,
      status: 'pending',
    });
  }
  return { id: uid(), date, startTime, endTime, interval, pool, events, status: 'active' };
}
