import {
  burningSchema,
  sessionSchema,
  metricSchema,
  type Session,
  type BurningSession,
} from '@heyaz/contracts';
import type { UserStore } from '../db/store.js';
import { addDays, localDate, monday, weekday } from '../time.js';
import { getPlan, getProfile } from './workouts.js';
export const calories = (weight: number, minutes: number, met = 4) => ({
  min: Math.round(((weight * met * minutes) / 60) * 0.8),
  max: Math.round(((weight * met * minutes) / 60) * 1.2),
});
export const volume = (session: Session) =>
  session.records
    .filter((r) => r.status === 'completed')
    .reduce((sum, r) => sum + r.weight * r.reps, 0);
export const minutes = (session: Session, now: Date) =>
  Math.max(
    0,
    Math.round(
      ((session.endedAt ? Date.parse(session.endedAt) : now.getTime()) -
        Date.parse(session.startedAt)) /
        60000,
    ),
  );
export const sessionResult = (session: Session, weight: number, now: Date) => ({
  session,
  minutes: minutes(session, now),
  volume: volume(session),
  calories: calories(weight, minutes(session, now)),
});
export function burningResult(session: BurningSession, weight: number) {
  const completed = session.events.filter((e) => e.status === 'completed').length;
  const partial = session.events.filter((e) => e.status === 'partial').length;
  const skipped = session.events.filter((e) => e.status === 'skipped').length;
  const estimatedMinutes =
    session.events.reduce(
      (n, e) => n + e.duration * (e.status === 'completed' ? 1 : e.status === 'partial' ? 0.5 : 0),
      0,
    ) / 60;
  return {
    session,
    total: session.events.length,
    completed,
    partial,
    skipped,
    completionRate: session.events.length ? (completed / session.events.length) * 100 : 0,
    estimatedMinutes,
    calories: calories(weight, estimatedMinutes, 5),
  };
}
export async function analytics(store: UserStore, days: number, now: Date) {
  const profile = await getProfile(store);
  const to = localDate(now, profile.timeZone),
    from = addDays(to, 1 - days);
  const sessions = (await store.list('session', sessionSchema))
    .filter((s) => s.status !== 'active' && s.date >= from && s.date <= to)
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt) || a.id.localeCompare(b.id));
  const burning = (await store.list('burning', burningSchema)).filter(
    (s) => s.date >= from && s.date <= to,
  );
  const totalMinutes = sessions.reduce((n, s) => n + minutes(s, now), 0);
  const best = new Map<Session['records'][number]['exerciseId'], number>();
  for (const session of sessions)
    for (const r of session.records)
      if (r.status === 'completed')
        best.set(r.exerciseId, Math.max(best.get(r.exerciseId) ?? 0, r.weight));
  return {
    from,
    to,
    sessionCount: sessions.length,
    workoutDays: new Set(sessions.map((s) => s.date)).size,
    totalMinutes,
    volume: sessions.reduce((n, s) => n + volume(s), 0),
    calories: sessions.reduce(
      (sum, s) => {
        const c = calories(profile.weight, minutes(s, now));
        return { min: sum.min + c.min, max: sum.max + c.max };
      },
      { min: 0, max: 0 },
    ),
    burningCompleted: burning.reduce(
      (n, s) => n + s.events.filter((e) => e.status === 'completed').length,
      0,
    ),
    trend: sessions.map((s) => ({ sessionId: s.id, date: s.date, volume: volume(s) })),
    bestWeights: [...best].map(([exerciseId, weight]) => ({ exerciseId, weight })),
  };
}
export async function dashboard(store: UserStore, now: Date) {
  const profile = await getProfile(store),
    plan = await getPlan(store);
  const today = localDate(now, profile.timeZone),
    from = monday(today),
    to = addDays(from, 6);
  const sessions = await store.list('session', sessionSchema);
  const ended = sessions.filter((s) => s.status !== 'active'),
    week = ended.filter((s) => s.date >= from && s.date <= to);
  const workoutDays = new Set(week.map((s) => s.date)).size;
  let routineDate = today;
  for (let offset = 0; offset < 7; offset++) {
    const date = addDays(today, offset);
    if (plan.days.some((d) => d.dayOfWeek === weekday(date))) {
      routineDate = date;
      break;
    }
  }
  return {
    today,
    routine: plan.days.find((d) => d.dayOfWeek === weekday(routineDate))!,
    routineDate,
    activeSession: sessions.find((s) => s.status === 'active') ?? null,
    week: {
      from,
      to,
      sessionCount: week.length,
      workoutDays,
      targetDays: plan.days.length,
      achievement: Math.min(100, (workoutDays / plan.days.length) * 100),
    },
    totalSessions: ended.length,
    todayMetric: (await store.get('metric', today, metricSchema)) ?? null,
  };
}
export async function activity(store: UserStore, from: string, to: string) {
  const sessions = await store.list('session', sessionSchema),
    burning = await store.list('burning', burningSchema);
  const result = [];
  for (let date = from; date <= to; date = addDays(date, 1)) {
    const performed = sessions.filter(
      (s) => s.date === date && s.records.some((r) => r.status === 'completed'),
    );
    const complete = performed.some((s) => s.status === 'completed');
    const status = !performed.length
      ? ('none' as const)
      : !complete
        ? ('partial' as const)
        : performed.length > 1
          ? ('extra' as const)
          : ('completed' as const);
    result.push({
      date,
      status,
      burning: burning.some(
        (s) =>
          s.date === date &&
          s.events.some((e) => e.status === 'completed' || e.status === 'partial'),
      ),
    });
  }
  return result;
}
