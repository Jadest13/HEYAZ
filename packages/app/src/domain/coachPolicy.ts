import type { AppState, CoachUsage } from '../types';
import { exercises } from '../constants/exercises';
const fifteenDays = 15 * 24 * 60 * 60 * 1000;
export function coachAllowance(state: Pick<AppState, 'coachUsage' | 'paidPlan'>, now = Date.now()) {
  const month = new Date(now);
  month.setDate(1);
  month.setHours(0, 0, 0, 0);
  const monthStart = month.getTime();
  const old = state.coachUsage;
  const usage: CoachUsage = old
    ? { ...old, free: { ...old.free }, paid: { ...old.paid } }
    : {
        free: { start: now, used: 0 },
        paid: { start: monthStart, used: 0 },
        corrections: 0,
        canCorrect: false,
      };
  if (now >= usage.free.start + fifteenDays)
    usage.free = {
      start: usage.free.start + Math.floor((now - usage.free.start) / fifteenDays) * fifteenDays,
      used: 0,
    };
  if (usage.paid.start !== monthStart) usage.paid = { start: monthStart, used: 0 };
  const bucket: 'paid' | 'free' = state.paidPlan ? 'paid' : 'free';
  const limit = state.paidPlan ? 100 : 5;
  const freeCorrection = usage.canCorrect && usage.corrections < 3;
  const nextMonth = new Date(month);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  return {
    usage,
    bucket,
    limit,
    remaining: Math.max(0, limit - usage[bucket].used),
    freeCorrection,
    resetAt: state.paidPlan ? nextMonth.getTime() : usage.free.start + fifteenDays,
  };
}
export function chargeCoach(state: Pick<AppState, 'coachUsage' | 'paidPlan'>, now = Date.now()) {
  const a = coachAllowance(state, now);
  if (!a.freeCorrection && a.remaining === 0)
    throw new Error('코치 이용 횟수를 모두 사용했어요. 다음 갱신일을 확인해주세요.');
  if (a.freeCorrection) a.usage.corrections++;
  else {
    a.usage[a.bucket].used++;
    a.usage.corrections = 0;
  }
  a.usage.canCorrect = false;
  return a.usage;
}
export function classifyQuestion(
  text: string,
  canCorrect = false,
): 'answer' | 'off-topic' | 'clarification' {
  if (/주식|코인|정치|대통령|로또|날씨|코딩|프로그래밍|여행|연애|영화|주가/.test(text))
    return 'off-topic';
  if (canCorrect && /^\s*\d+\s*(분|회|kg|초)?\s*$/.test(text)) return 'answer';
  if (exercises.some((exercise) => text.includes(exercise.name))) return 'answer';
  if (
    !/운동|계획|루틴|근력|체력|헬스|세트|중량|스쿼트|플랭크|푸시업|팔굽혀|벤치|체중|BMI|기록|회복|스트레칭|칼로리|단백질|분|강도|피로|수면|장비|맨몸|허리|무릎|통증|체지방|근육/.test(
      text,
    )
  )
    return 'off-topic';
  if (/바꿔|변경|조정|추천/.test(text) && !/\d|계획|루틴|시간|중량|체력/.test(text))
    return 'clarification';
  return 'answer';
}
