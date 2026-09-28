import { randomUUID } from 'node:crypto';
import type { z } from 'zod';
import {
  burningSchema,
  type burningInputSchema,
  type burningEventInputSchema,
  type BurningSession,
} from '@heyaz/contracts';
import type { UserStore } from '../db/store.js';
import { ApiError, conflict } from '../errors.js';
import { atLocal, localDate } from '../time.js';
import { getProfile } from './workouts.js';
export async function startBurning(
  store: UserStore,
  input: z.infer<typeof burningInputSchema>,
  now: Date,
  random = Math.random,
) {
  if ((await store.list('burning', burningSchema)).some((s) => s.status === 'active'))
    throw new ApiError(409, 'ACTIVE_BURNING', '진행 중인 Burning Day를 먼저 종료해주세요.');
  const { timeZone } = await getProfile(store);
  const date = localDate(now, timeZone);
  const start = atLocal(date, input.startTime, timeZone).getTime();
  const end = atLocal(date, input.endTime, timeZone).getTime();
  const events: BurningSession['events'] = [];
  let previous = '';
  for (let at = start; at < end; at += input.interval * 60000) {
    const weights = input.pool.map((id) => (id === previous ? 0.1 : 1));
    let cursor = random() * weights.reduce((a, b) => a + b, 0);
    let selected = input.pool.at(-1)!;
    for (let i = 0; i < weights.length; i++) {
      cursor -= weights[i];
      if (cursor < 0) {
        selected = input.pool[i];
        break;
      }
    }
    previous = selected;
    events.push({
      id: randomUUID(),
      scheduledAt: new Date(at).toISOString(),
      exerciseId: selected,
      reps: 15,
      duration: 30,
      status: 'pending',
    });
  }
  const session: BurningSession = {
    ...input,
    id: randomUUID(),
    revision: 1,
    date,
    timeZone,
    events,
    status: 'active',
  };
  await store.put('burning', session.id, session);
  return session;
}
async function active(store: UserStore, id: string, expected: number) {
  const session = await store.require('burning', id, burningSchema);
  conflict(session.revision, expected);
  if (session.status !== 'active')
    throw new ApiError(409, 'BURNING_ENDED', '이미 종료된 Burning Day입니다.');
  return session;
}
export async function changeEvent(
  store: UserStore,
  id: string,
  eventId: string,
  input: z.infer<typeof burningEventInputSchema>,
  now: Date,
) {
  const session = await active(store, id, input.baseRevision);
  const event = session.events.find((e) => e.id === eventId);
  if (!event) throw new ApiError(404, 'EVENT_NOT_FOUND', '해당 이벤트를 찾을 수 없습니다.');
  if (event.status !== 'pending')
    throw new ApiError(409, 'EVENT_PROCESSED', '이미 처리한 이벤트입니다.');
  if (input.action === 'update') {
    event.reps = input.reps ?? event.reps;
    event.duration = input.duration ?? event.duration;
  } else if (input.action === 'replace') {
    if (session.pool.length < 2)
      throw new ApiError(409, 'NO_REPLACEMENT', '교체하려면 운동 풀에 2개 이상이 필요합니다.');
    event.exerciseId =
      session.pool[(session.pool.indexOf(event.exerciseId) + 1) % session.pool.length];
  } else {
    if (session.events.find((e) => e.status === 'pending')?.id !== eventId)
      throw new ApiError(409, 'EVENT_ORDER', '가장 이른 미처리 이벤트부터 진행해주세요.');
    if (Date.parse(event.scheduledAt) > now.getTime())
      throw new ApiError(409, 'EVENT_NOT_DUE', '예정 시각 이후에 처리할 수 있습니다.');
    event.status = input.action;
  }
  session.revision++;
  await store.put('burning', session.id, session);
  return session;
}
export async function finishBurning(store: UserStore, id: string, expected: number) {
  const session = await active(store, id, expected);
  session.status = 'ended';
  session.revision++;
  session.events.forEach((e) => {
    if (e.status === 'pending') e.status = 'skipped';
  });
  await store.put('burning', session.id, session);
  return session;
}
