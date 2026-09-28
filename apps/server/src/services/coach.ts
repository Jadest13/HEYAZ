import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  allowanceSchema,
  assessmentSchema,
  exercises,
  messageSchema,
  planInputSchema,
  planSchema,
  proposalSchema,
  sessionSchema,
  usageSchema,
  type Profile,
  type Plan,
  type Session,
  type Message,
  type Usage,
} from '@heyaz/contracts';
import type { UserStore } from '../db/store.js';
import { ApiError, conflict } from '../errors.js';
import { monthWindow } from '../time.js';
import { getPlan, getProfile, normalizePlanned } from './workouts.js';
import { volume } from './reports.js';
const fifteenDays = 15 * 24 * 60 * 60 * 1000;
export const replySchema = z
  .strictObject({
    text: z.string().min(1).max(10000),
    outcome: z.enum(['answer', 'off-topic', 'clarification']),
    proposal: z
      .strictObject({ plan: planInputSchema, reason: z.string().min(1).max(2000) })
      .optional(),
  })
  .refine(
    (v) => !v.proposal || v.outcome === 'answer',
    '계획 제안은 정상 답변에만 포함할 수 있습니다.',
  );
export interface CoachContext {
  profile: Profile;
  plan: Plan;
  sessions: Session[];
  assessments: z.infer<typeof assessmentSchema>[];
  canCorrect: boolean;
}
export interface CoachProvider {
  reply(text: string, context: CoachContext): Promise<unknown>;
}
export class MockCoach implements CoachProvider {
  async reply(text: string, context: CoachContext): Promise<z.infer<typeof replySchema>> {
    const exerciseQuestion =
      /운동|계획|루틴|근력|체력|헬스|세트|중량|스쿼트|플랭크|푸시업|팔굽혀|벤치|체중|BMI|기록|회복|스트레칭|칼로리|단백질|분|강도|피로|수면|장비|맨몸|허리|무릎|통증|체지방|근육/;
    const shortCorrection = context.canCorrect && /^\s*\d+\s*(분|회|kg|초)?\s*$/.test(text);
    if (
      /주식|코인|정치|대통령|로또|날씨|코딩|프로그래밍|여행|연애|영화|주가/.test(text) ||
      (!exerciseQuestion.test(text) && !shortCorrection)
    )
      return {
        text: '운동과 관련한 질문으로 다시 알려주세요. 현재는 규칙 기반 데모 코치입니다.',
        outcome: 'off-topic',
      };
    if (/바꿔|변경|조정|추천/.test(text) && !/\d|계획|루틴|시간|중량|체력/.test(text))
      return { text: '가능한 시간이나 목표를 알려주세요.', outcome: 'clarification' };
    if (/체력/.test(text) && /추천|확인할/.test(text))
      return {
        text: '푸시업·스쿼트·플랭크 등 편안하게 수행한 값을 체력 확인에 기록해주세요. 현재는 데모 안내입니다.',
        outcome: 'answer',
      };
    if (shortCorrection && /^\s*\d+\s*$/.test(text)) text = `${text.trim()}분 계획`;
    if (/체력|분|계획|강도|줄|늘/.test(text)) {
      const parsedMinutes = text.match(/(\d+)\s*분/);
      const minutes = parsedMinutes
        ? Math.max(10, Math.min(120, Number(parsedMinutes[1])))
        : context.profile.minutes;
      const assessment = /체력|검사/.test(text) ? context.assessments.at(-1) : undefined;
      const excluded = context.profile.excluded.trim().toLowerCase();
      const allowed = (id: string) => {
        const e = exercises.find((e) => e.id === id)!;
        return !excluded.includes(id) && !excluded.includes(e.name.toLowerCase());
      };
      const days = context.profile.days.map((dayOfWeek, i) => {
        const original = structuredClone(context.plan.days[i % context.plan.days.length]);
        const items = assessment
          ? assessment.records.map((r) =>
              normalizePlanned({
                ...r,
                id: randomUUID(),
                sets: Math.min(3, r.sets),
                reps: r.reps ? Math.max(1, Math.floor(r.reps * 0.7)) : 0,
                duration: Math.max(5, Math.floor(r.duration * 0.7)),
                weight: Math.floor(r.weight * 0.7 * 2) / 2,
              }),
            )
          : original.exercises.map((e) => ({
              ...e,
              id: randomUUID(),
              sets: minutes <= 30 ? 2 : 3,
            }));
        return {
          ...original,
          id: randomUUID(),
          dayOfWeek,
          estimatedDuration: minutes,
          exercises: items
            .filter((e) => allowed(e.exerciseId))
            .slice(0, Math.max(1, Math.floor(minutes / 8))),
        };
      });
      if (days.some((d) => !d.exercises.length))
        return {
          text: '제외 운동을 반영한 뒤 사용할 운동이 없습니다. 운동 조건을 조정해주세요.',
          outcome: 'clarification',
        };
      return {
        text: '규칙 기반 데모 제안입니다. 내용을 확인하고 적용해주세요.',
        outcome: 'answer',
        proposal: {
          plan: {
            name: `${context.profile.name}님의 ${minutes}분 루틴`,
            startDate: context.plan.startDate,
            endDate: context.plan.endDate,
            goal: context.profile.goal,
            days,
          },
          reason: assessment
            ? '체력 확인 수치의 약 70%와 제외 운동 조건을 반영했습니다.'
            : `가능한 요일에 ${minutes}분 운동으로 구성했습니다.`,
        },
      };
    }
    const sessions = context.sessions.filter((s) => s.status !== 'active');
    return {
      text: `데모 기록 요약: 종료 운동 ${sessions.length}회, 총 볼륨 ${sessions.reduce((n, s) => n + volume(s), 0)}kg입니다.`,
      outcome: 'answer',
    };
  }
}
export function allowance(current: Usage, paid: boolean, now: Date) {
  const usage = structuredClone(current),
    month = monthWindow(now, usage.timeZone);
  if (usage.free.start && now.getTime() >= Date.parse(usage.free.start) + fifteenDays) {
    usage.free = {
      start: new Date(
        Date.parse(usage.free.start) +
          Math.floor((now.getTime() - Date.parse(usage.free.start)) / fifteenDays) * fifteenDays,
      ).toISOString(),
      used: 0,
    };
  }
  if (usage.paid.start && usage.paid.start !== month.start)
    usage.paid = { start: month.start, used: 0 };
  const bucket = paid ? 'paid' : 'free',
    limit = paid ? 100 : 5;
  return allowanceSchema.parse({
    plan: bucket,
    limit,
    remaining: Math.max(0, limit - usage[bucket].used),
    freeCorrection: usage.canCorrect && usage.corrections < 3,
    resetAt: paid
      ? month.next
      : usage.free.start
        ? new Date(Date.parse(usage.free.start) + fifteenDays).toISOString()
        : null,
    usage,
  });
}
export async function getAllowance(store: UserStore, now: Date) {
  return allowance(await store.require('usage', 'current', usageSchema), store.paid, now);
}
async function providerReply(provider: CoachProvider, text: string, context: CoachContext) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      provider.reply(text, context),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Coach timeout')), 15000);
      }),
    ]);
    return replySchema.parse(result);
  } catch {
    throw new ApiError(
      503,
      'COACH_UNAVAILABLE',
      '코치 응답을 생성하지 못했습니다. 이용량은 차감되지 않았습니다.',
    );
  } finally {
    clearTimeout(timer);
  }
}
export async function sendMessage(
  store: UserStore,
  text: string,
  now: Date,
  requestKey: string,
  provider?: CoachProvider,
) {
  if (!provider)
    throw new ApiError(503, 'COACH_DISABLED', '실제 코치 서비스가 아직 연결되지 않았습니다.');
  const profile = await getProfile(store),
    plan = await getPlan(store);
  const oldUsage = await store.require('usage', 'current', usageSchema);
  if (!oldUsage.free.start && !oldUsage.paid.start) oldUsage.timeZone = profile.timeZone;
  const available = allowance(oldUsage, store.paid, now);
  if (!available.freeCorrection && available.remaining === 0)
    throw new ApiError(429, 'COACH_QUOTA_EXCEEDED', '코치 이용 횟수를 모두 사용했습니다.');
  const reply = await providerReply(provider, text, {
    profile,
    plan,
    canCorrect: available.freeCorrection,
    sessions: await store.list('session', sessionSchema),
    assessments: await store.list('assessment', assessmentSchema),
  });
  const usage = available.usage;
  if (available.freeCorrection) usage.corrections++;
  else {
    const bucket = available.plan;
    if (!usage[bucket].start)
      usage[bucket].start =
        bucket === 'paid' ? monthWindow(now, usage.timeZone).start : now.toISOString();
    usage[bucket].used++;
    usage.corrections = 0;
  }
  usage.canCorrect = reply.outcome === 'off-topic' || reply.outcome === 'clarification';
  const user: Message = {
    id: randomUUID(),
    role: 'user',
    text,
    components: [],
    createdAt: now.toISOString(),
  };
  const assistant: Message = {
    id: randomUUID(),
    role: 'assistant',
    text: reply.text,
    components: [],
    outcome: reply.outcome,
    createdAt: new Date(now.getTime() + 1).toISOString(),
  };
  if (reply.proposal) {
    const after = planSchema.parse({
      ...reply.proposal.plan,
      id: plan.id,
      createdBy: 'AI',
      revision: plan.revision + 1,
      createdAt: plan.createdAt,
      updatedAt: now.toISOString(),
    });
    const proposal = proposalSchema.parse({
      id: randomUUID(),
      baseRevision: plan.revision,
      before: plan,
      after,
      reason: reply.proposal.reason,
      status: 'pending',
    });
    await store.put('proposal', proposal.id, proposal);
    assistant.components.push({ type: 'PLAN_CHANGE', proposal });
  }
  await store.put('message', user.id, user);
  await store.put('message', assistant.id, assistant);
  await store.put('usage', 'current', usage);
  await store.ledger(
    requestKey,
    available.freeCorrection ? 'correction' : available.plan,
    reply.outcome,
    now,
  );
  return { user, assistant, allowance: allowance(usage, store.paid, now) };
}
export async function decideProposal(
  store: UserStore,
  id: string,
  action: 'apply' | 'reject',
  now: Date,
) {
  const proposal = await store.require('proposal', id, proposalSchema);
  if (proposal.status !== 'pending')
    throw new ApiError(409, 'PROPOSAL_PROCESSED', '이미 처리한 제안입니다.');
  if (action === 'apply') {
    const current = await getPlan(store);
    conflict(current.revision, proposal.baseRevision);
    const plan = planSchema.parse({
      ...proposal.after,
      id: current.id,
      revision: current.revision + 1,
      updatedAt: now.toISOString(),
    });
    await store.put('plan', 'current', plan);
    proposal.after = plan;
  }
  proposal.status = action === 'apply' ? 'applied' : 'rejected';
  await store.put('proposal', id, proposal);
  for (const message of await store.list('message', messageSchema)) {
    if (message.components.some((c) => c.type === 'PLAN_CHANGE' && c.proposal.id === id)) {
      message.components = message.components.map((c) =>
        c.type === 'PLAN_CHANGE' && c.proposal.id === id ? { ...c, proposal } : c,
      );
      await store.put('message', message.id, message);
    }
  }
  return proposal;
}
