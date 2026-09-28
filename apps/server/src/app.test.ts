import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import * as c from '@heyaz/contracts';
import { createApp } from './app.js';
import { connectDatabase } from './db/connection.js';
import { Repository } from './db/store.js';
import { accounts, usageLedger } from './db/schema.js';
import { ApiError } from './errors.js';
import { MockCoach, allowance, type CoachProvider } from './services/coach.js';
import { readConfig } from './config.js';
import { createAuthenticator } from './auth.js';
import { atLocal, localDate } from './time.js';
let connection: Awaited<ReturnType<typeof connectDatabase>>;
let repository: Repository;
let now: Date;
let provider: CoachProvider;
let app: ReturnType<typeof createApp>;
beforeAll(async () => {
  connection = await connectDatabase({ driver: 'pglite' });
  await connection.migrate();
  repository = new Repository(connection.db);
}, 30000);
afterAll(async () => {
  await connection?.close();
});
beforeEach(async () => {
  await connection.db.execute(sql`truncate table accounts cascade`);
  now = new Date('2026-09-08T01:00:00.000Z');
  provider = new MockCoach();
  app = createApp({
    repository,
    authenticate: async (request) => {
      const value = request.headers.get('authorization');
      if (value !== 'Bearer alice' && value !== 'Bearer bob')
        throw new ApiError(401, 'UNAUTHORIZED', '인증 필요');
      return value.slice(7);
    },
    origins: ['http://localhost:5173'],
    now: () => now,
    random: () => 0.5,
    coach: { reply: (text, context) => provider.reply(text, context) },
  });
});
const request = (
  method: string,
  path: string,
  body?: unknown,
  user = 'alice',
  key: string = randomUUID(),
) =>
  app.request(`/api/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${user}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': key,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
async function read<S extends z.ZodType>(
  schema: S,
  path: string,
  user = 'alice',
): Promise<z.output<S>> {
  const response = await request('GET', path, undefined, user);
  expect(response.status).toBe(200);
  return schema.parse(await response.json());
}
async function write<S extends z.ZodType>(
  schema: S,
  method: string,
  path: string,
  body: unknown,
  key?: string,
): Promise<z.output<S>> {
  const response = await request(method, path, body, 'alice', key);
  expect([200, 201]).toContain(response.status);
  return schema.parse(await response.json());
}
async function planInput() {
  const plan = await read(c.planSchema, '/plan');
  const {
    id: _id,
    revision,
    createdAt: _created,
    updatedAt: _updated,
    createdBy: _by,
    ...fields
  } = plan;
  return { ...fields, baseRevision: revision };
}
async function profileInput() {
  const profile = await read(c.profileSchema, '/profile');
  const { revision, onboarded: _onboarded, ...fields } = profile;
  return { ...fields, baseRevision: revision };
}
async function start() {
  const plan = await read(c.planSchema, '/plan');
  return write(c.sessionSchema, 'POST', '/sessions', {
    dayId: plan.days[0].id,
    planRevision: plan.revision,
  });
}
const record = (s: c.Session) => ({
  baseRevision: s.revision,
  plannedExerciseId: s.day.exercises[0].id,
  set: 1,
  status: 'completed',
  reps: 10,
  weight: 20,
  duration: 0,
});
const replyResponse = z.object({
  user: c.messageSchema,
  assistant: c.messageSchema,
  allowance: c.allowanceSchema,
});
describe('HTTP boundary and contracts', () => {
  it('serves health, database readiness and OpenAPI for all API operations', async () => {
    expect((await app.request('/health')).status).toBe(200);
    expect((await app.request('/ready')).status).toBe(200);
    const response = await app.request('/openapi.json');
    expect(response.status).toBe(200);
    const doc = z
      .object({
        paths: z.record(z.string(), z.unknown()),
        components: z.object({ securitySchemes: z.unknown() }),
      })
      .parse(await response.json());
    expect(doc.paths['/api/v1/plan']).toMatchObject({
      get: { security: [{ bearerAuth: [] }] },
      put: { requestBody: { required: true } },
    });
    expect(doc.paths['/api/v1/sessions/{id}/sets']).toBeDefined();
    expect(doc.paths['/api/v1/coach/messages']).toBeDefined();
  });
  it('requires identity, blocks unapproved origins and returns consistent errors', async () => {
    const unauthorized = await app.request('/api/v1/profile');
    expect(unauthorized.status).toBe(401);
    expect(unauthorized.headers.get('www-authenticate')).toBe('Bearer');
    expect(c.errorSchema.parse(await unauthorized.json()).error.requestId).toBeTruthy();
    expect(
      (
        await app.request('/api/v1/profile', {
          headers: { authorization: 'Bearer alice', origin: 'https://unknown.example' },
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await app.request('/api/v1/profile', {
          method: 'OPTIONS',
          headers: { origin: 'http://localhost:5173', 'access-control-request-method': 'GET' },
        })
      ).status,
    ).toBe(204);
    expect((await app.request('/unknown')).status).toBe(404);
  });
  it('validates JSON, content type, idempotency headers and body size', async () => {
    const headers = {
      authorization: 'Bearer alice',
      'idempotency-key': randomUUID(),
      'content-type': 'application/json',
    };
    expect(
      (await app.request('/api/v1/profile', { method: 'PUT', headers, body: '{invalid' })).status,
    ).toBe(400);
    expect(
      (
        await app.request('/api/v1/profile', {
          method: 'PUT',
          headers: { ...headers, 'content-type': 'text/plain' },
          body: '{}',
        })
      ).status,
    ).toBe(415);
    expect(
      (
        await app.request('/api/v1/profile', {
          method: 'PUT',
          headers: { authorization: 'Bearer alice', 'content-type': 'application/json' },
          body: '{}',
        })
      ).status,
    ).toBe(422);
    expect(
      (
        await app.request('/api/v1/profile', {
          method: 'PUT',
          headers,
          body: JSON.stringify({ x: 'a'.repeat(256 * 1024) }),
        })
      ).status,
    ).toBe(413);
  });
  it('rejects malformed dates, fractional counts, unknown fields and query ambiguities', async () => {
    const input = await planInput();
    for (const bad of [
      { ...input, startDate: '2026-02-30' },
      { ...input, paidPlan: true },
      { ...input, days: [{ ...input.days[0], startTime: '25:99' }] },
      {
        ...input,
        days: [{ ...input.days[0], exercises: [{ ...input.days[0].exercises[0], reps: 1.5 }] }],
      },
    ])
      expect((await request('PUT', '/plan', bad)).status).toBe(422);
    expect((await request('GET', '/sessions?limit=2&limit=3')).status).toBe(422);
    expect((await request('GET', '/sessions?limit=0')).status).toBe(422);
    expect((await request('GET', '/sessions?unknown=1')).status).toBe(422);
    expect((await request('GET', '/sessions/not-a-uuid')).status).toBe(422);
    expect((await request('GET', '/activity?from=2026-01-01&to=2028-01-01')).status).toBe(422);
    expect((await request('GET', '/activity?from=2026-02-30&to=2026-03-01')).status).toBe(422);
  });
});
describe('user data and plans', () => {
  it('starts with a sample plan and no performed history', async () => {
    const dashboard = await read(c.dashboardSchema, '/dashboard');
    expect(dashboard.totalSessions).toBe(0);
    expect(dashboard.activeSession).toBeNull();
    expect((await read(c.listSchema(c.sessionSchema), '/sessions')).items).toEqual([]);
    expect((await read(c.listSchema(c.metricSchema), '/metrics')).items).toEqual([]);
    expect(dashboard.routineDate).toBe('2026-09-09');
  });
  it('isolates profiles and sessions by authenticated user', async () => {
    await write(c.profileSchema, 'PUT', '/profile', { ...(await profileInput()), name: 'Alice' });
    expect((await read(c.profileSchema, '/profile', 'bob')).name).toBe('회원');
    const session = await start();
    expect((await request('GET', `/sessions/${session.id}`, undefined, 'bob')).status).toBe(404);
    expect((await read(c.listSchema(c.sessionSchema), '/sessions', 'bob')).total).toBe(0);
  });
  it('keeps plan and snapshot unchanged when a profile or current plan changes', async () => {
    const before = await read(c.planSchema, '/plan');
    const session = await start();
    await write(c.profileSchema, 'PUT', '/profile', { ...(await profileInput()), days: [0] });
    expect((await read(c.planSchema, '/plan')).revision).toBe(before.revision);
    const input = await planInput();
    input.days[0].exercises[0].weight = 80;
    await write(c.planSchema, 'PUT', '/plan', input);
    expect(
      (await read(c.sessionResultSchema, `/sessions/${session.id}`)).session.day.exercises[0]
        .weight,
    ).toBe(20);
  });
  it('serializes simultaneous edits and retains the stable plan ID', async () => {
    const original = await read(c.planSchema, '/plan');
    const input = await planInput();
    const results = await Promise.all([
      request('PUT', '/plan', { ...input, name: 'A' }),
      request('PUT', '/plan', { ...input, name: 'B' }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    const current = await read(c.planSchema, '/plan');
    expect(current.id).toBe(original.id);
    expect(current.revision).toBe(2);
  });
  it('rejects duplicate weekdays and invalid exercise identities', async () => {
    const input = await planInput();
    input.days[1].dayOfWeek = input.days[0].dayOfWeek;
    expect((await request('PUT', '/plan', input)).status).toBe(422);
    const fresh = await planInput();
    expect(
      (
        await request('PUT', '/plan', {
          ...fresh,
          days: [
            {
              ...fresh.days[0],
              exercises: [{ ...fresh.days[0].exercises[0], exerciseId: 'missing' }],
            },
          ],
        })
      ).status,
    ).toBe(422);
  });
});
describe('workout lifecycle', () => {
  it('permits only one active workout under simultaneous starts', async () => {
    const plan = await read(c.planSchema, '/plan');
    const body = { dayId: plan.days[0].id, planRevision: 1 };
    const results = await Promise.all([
      request('POST', '/sessions', body),
      request('POST', '/sessions', body),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
  });
  it('replays a repeated request exactly and rejects reuse for a different payload', async () => {
    const plan = await read(c.planSchema, '/plan'),
      key = randomUUID();
    const body = { dayId: plan.days[0].id, planRevision: 1 };
    const first = await request('POST', '/sessions', body, 'alice', key),
      replay = await request('POST', '/sessions', body, 'alice', key);
    expect(replay.status).toBe(201);
    expect(await replay.json()).toEqual(await first.json());
    expect((await read(c.listSchema(c.sessionSchema), '/sessions')).total).toBe(1);
    expect(
      (await request('POST', '/sessions', { ...body, dayId: plan.days[1].id }, 'alice', key))
        .status,
    ).toBe(409);
  });
  it('enforces set order, rest, duplicate sets, revisions and exercise replacement rules', async () => {
    let session = await start();
    const input = record(session);
    expect(
      (await request('POST', `/sessions/${session.id}/sets`, { ...input, set: 4 })).status,
    ).toBe(422);
    expect(
      (await request('POST', `/sessions/${session.id}/sets`, { ...input, set: 2 })).status,
    ).toBe(409);
    const key = randomUUID();
    session = await write(c.sessionSchema, 'POST', `/sessions/${session.id}/sets`, input, key);
    expect(
      (await write(c.sessionSchema, 'POST', `/sessions/${session.id}/sets`, input, key)).revision,
    ).toBe(2);
    expect(
      (await request('POST', `/sessions/${session.id}/sets`, { ...input, baseRevision: 2 })).status,
    ).toBe(409);
    expect(
      (await request('POST', `/sessions/${session.id}/sets`, { ...input, baseRevision: 2, set: 2 }))
        .status,
    ).toBe(409);
    expect(
      (
        await request('POST', `/sessions/${session.id}/replace`, {
          baseRevision: 2,
          plannedExerciseId: input.plannedExerciseId,
          exerciseId: 'pushup',
        })
      ).status,
    ).toBe(409);
    session = await write(c.sessionSchema, 'POST', `/sessions/${session.id}/rest`, {
      baseRevision: 2,
      action: 'extend',
    });
    expect(session.restUntil).toBe('2026-09-08T01:01:30.000Z');
    session = await write(c.sessionSchema, 'POST', `/sessions/${session.id}/rest`, {
      baseRevision: 3,
      action: 'skip',
    });
    session = await write(c.sessionSchema, 'POST', `/sessions/${session.id}/sets`, {
      ...input,
      baseRevision: 4,
      set: 2,
      status: 'skipped',
    });
    expect(session.records[1].weight).toBe(0);
    now = new Date('2026-09-08T01:10:00Z');
    session = await write(c.sessionSchema, 'POST', `/sessions/${session.id}/finish`, {
      baseRevision: 5,
    });
    expect(session.status).toBe('partial');
    expect(session.restUntil).toBeUndefined();
    const result = await read(c.sessionResultSchema, `/sessions/${session.id}`);
    expect(result.volume).toBe(200);
    expect(result.minutes).toBe(10);
    expect(
      (await request('POST', `/sessions/${session.id}/sets`, { ...input, baseRevision: 6, set: 3 }))
        .status,
    ).toBe(409);
    expect(await read(c.sessionSchema.nullable(), '/sessions/active')).toBeNull();
  });
  it('normalizes replacement fields and marks a fully performed routine completed', async () => {
    const input = await planInput();
    input.days = [
      { ...input.days[0], exercises: [{ ...input.days[0].exercises[0], sets: 1, restSeconds: 0 }] },
    ];
    await write(c.planSchema, 'PUT', '/plan', input);
    let session = await start();
    session = await write(c.sessionSchema, 'POST', `/sessions/${session.id}/replace`, {
      baseRevision: 1,
      plannedExerciseId: session.day.exercises[0].id,
      exerciseId: 'pushup',
    });
    expect(session.day.exercises[0].weight).toBe(0);
    session = await write(c.sessionSchema, 'POST', `/sessions/${session.id}/sets`, {
      ...record(session),
      weight: 0,
    });
    session = await write(c.sessionSchema, 'POST', `/sessions/${session.id}/finish`, {
      baseRevision: session.revision,
    });
    expect(session.status).toBe('completed');
    const analytics = await read(c.analyticsSchema, '/analytics?days=7');
    expect(analytics.sessionCount).toBe(1);
    expect(analytics.volume).toBe(0);
    expect(
      (await read(z.array(c.activitySchema), '/activity?from=2026-09-08&to=2026-09-08'))[0].status,
    ).toBe('completed');
  });
  it('counts zero-set ended sessions in analytics while activity stays empty', async () => {
    const session = await start();
    await write(c.sessionSchema, 'POST', `/sessions/${session.id}/finish`, { baseRevision: 1 });
    expect((await read(c.analyticsSchema, '/analytics')).sessionCount).toBe(1);
    expect(
      (await read(z.array(c.activitySchema), '/activity?from=2026-09-08&to=2026-09-08'))[0].status,
    ).toBe('none');
  });
});
describe('measurements and assessments', () => {
  it('calculates BMI on the server, rejects future dates and protects same-date updates', async () => {
    const body = { baseRevision: 0, date: '2026-09-08', weight: 70, bodyFatPercentage: 20 };
    let metric = await write(c.metricSchema, 'PUT', '/metrics', body);
    expect(metric.bmi).toBe(24.2);
    expect((await request('PUT', '/metrics', body)).status).toBe(409);
    metric = await write(c.metricSchema, 'PUT', '/metrics', {
      baseRevision: 1,
      date: body.date,
      weight: 71,
    });
    expect(metric.bodyFatPercentage).toBeUndefined();
    expect((await read(c.listSchema(c.metricSchema), '/metrics')).total).toBe(1);
    expect((await read(c.profileSchema, '/profile')).weight).toBe(65);
    expect((await request('PUT', '/metrics', { ...body, date: '2026-09-09' })).status).toBe(422);
    expect((await request('PUT', '/metrics', { ...body, bmi: 10 })).status).toBe(422);
    await write(c.profileSchema, 'PUT', '/profile', { ...(await profileInput()), height: 180 });
    expect((await read(c.listSchema(c.metricSchema), '/metrics')).items[0].height).toBe(170);
  });
  it('stores assessment without changing the plan and paginates date ranges', async () => {
    const plan = await read(c.planSchema, '/plan');
    const records = [plan.days[0].exercises[0]];
    await write(c.assessmentSchema, 'POST', '/assessments', { records });
    await write(c.assessmentSchema, 'POST', '/assessments', { records });
    const page = await read(
      c.listSchema(c.assessmentSchema),
      '/assessments?limit=1&offset=1&from=2026-09-08&to=2026-09-08',
    );
    expect(page.items).toHaveLength(1);
    expect(page.total).toBe(2);
    expect((await read(c.planSchema, '/plan')).revision).toBe(plan.revision);
  });
});
describe('Burning Day', () => {
  it('creates an end-exclusive schedule and enforces event order and due time', async () => {
    let session = await write(c.burningSchema, 'POST', '/burning-days', {
      startTime: '09:00',
      endTime: '12:00',
      interval: 60,
      pool: ['pushup', 'plank'],
    });
    expect(session.events.map((e) => e.scheduledAt)).toEqual([
      '2026-09-08T00:00:00.000Z',
      '2026-09-08T01:00:00.000Z',
      '2026-09-08T02:00:00.000Z',
    ]);
    expect(
      (
        await request('POST', '/burning-days', {
          startTime: '09:00',
          endTime: '12:00',
          interval: 60,
          pool: ['pushup'],
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await request('POST', `/burning-days/${session.id}/events/${session.events[1].id}`, {
          baseRevision: 1,
          action: 'completed',
        })
      ).status,
    ).toBe(409);
    session = await write(
      c.burningSchema,
      'POST',
      `/burning-days/${session.id}/events/${session.events[0].id}`,
      { baseRevision: 1, action: 'partial' },
    );
    session = await write(
      c.burningSchema,
      'POST',
      `/burning-days/${session.id}/events/${session.events[1].id}`,
      { baseRevision: 2, action: 'completed' },
    );
    expect(
      (
        await request('POST', `/burning-days/${session.id}/events/${session.events[2].id}`, {
          baseRevision: 3,
          action: 'completed',
        })
      ).status,
    ).toBe(409);
    session = await write(
      c.burningSchema,
      'POST',
      `/burning-days/${session.id}/events/${session.events[2].id}`,
      { baseRevision: 3, action: 'update', duration: 60 },
    );
    session = await write(c.burningSchema, 'POST', `/burning-days/${session.id}/finish`, {
      baseRevision: 4,
    });
    expect(session.events[2].status).toBe('skipped');
    const result = await read(c.burningResultSchema, `/burning-days/${session.id}`);
    expect(result.completed).toBe(1);
    expect(result.partial).toBe(1);
    expect(result.estimatedMinutes).toBe(0.75);
    const [day] = await read(z.array(c.activitySchema), '/activity?from=2026-09-08&to=2026-09-08');
    expect(day.burning).toBe(true);
    expect(day.status).toBe('none');
  });
  it('rejects duplicate pools and impossible schedules', async () => {
    for (const body of [
      { startTime: '12:00', endTime: '09:00', interval: 60, pool: ['pushup'] },
      { startTime: '09:00', endTime: '12:00', interval: 60, pool: ['pushup', 'pushup'] },
    ])
      expect((await request('POST', '/burning-days', body)).status).toBe(422);
  });
});
describe('coach, quota and approvals', () => {
  it('starts the free window on first successful charge and caches retries', async () => {
    expect((await read(c.allowanceSchema, '/coach/usage')).usage.free.start).toBeNull();
    const key = randomUUID();
    const first = await write(
      replyResponse,
      'POST',
      '/coach/messages',
      { text: '운동 기록 분석' },
      key,
    );
    expect(first.allowance.remaining).toBe(4);
    expect(first.allowance.resetAt).toBe('2026-09-23T01:00:00.000Z');
    const replay = await write(
      replyResponse,
      'POST',
      '/coach/messages',
      { text: '운동 기록 분석' },
      key,
    );
    expect(replay).toEqual(first);
    expect((await read(c.listSchema(c.messageSchema), '/coach/messages')).total).toBe(3);
    const ledger = await connection.db.select().from(usageLedger);
    expect(ledger).toHaveLength(1);
  });
  it('caps the free quota even for concurrent requests', async () => {
    const results = await Promise.all(
      Array.from({ length: 6 }, () =>
        request('POST', '/coach/messages', { text: '운동 기록 분석' }),
      ),
    );
    expect(results.filter((r) => r.status === 201)).toHaveLength(5);
    expect(results.filter((r) => r.status === 429)).toHaveLength(1);
    expect((await read(c.allowanceSchema, '/coach/usage')).remaining).toBe(0);
  });
  it('allows only three free corrections and ends correction eligibility after an answer', async () => {
    await write(replyResponse, 'POST', '/coach/messages', { text: '날씨' });
    for (let i = 0; i < 3; i++)
      await write(replyResponse, 'POST', '/coach/messages', { text: '날씨' });
    let usage = await read(c.allowanceSchema, '/coach/usage');
    expect(usage.remaining).toBe(4);
    expect(usage.freeCorrection).toBe(false);
    expect(usage.usage.corrections).toBe(3);
    await write(replyResponse, 'POST', '/coach/messages', { text: '운동 기록 분석' });
    usage = await read(c.allowanceSchema, '/coach/usage');
    expect(usage.remaining).toBe(3);
    expect(usage.freeCorrection).toBe(false);
  });
  it('does not persist failed or invalid provider replies or charge their usage', async () => {
    provider = {
      reply: async () => {
        throw new Error('service unavailable');
      },
    };
    expect((await request('POST', '/coach/messages', { text: '운동 기록 분석' })).status).toBe(503);
    provider = { reply: async () => ({ text: 'bad', outcome: 'invented' }) };
    expect((await request('POST', '/coach/messages', { text: '운동 기록 분석' })).status).toBe(503);
    expect((await read(c.allowanceSchema, '/coach/usage')).remaining).toBe(5);
    expect((await read(c.listSchema(c.messageSchema), '/coach/messages')).total).toBe(1);
    expect(await connection.db.select().from(usageLedger)).toHaveLength(0);
  });
  it('applies a proposal only after approval and rejects stale or already processed proposals', async () => {
    const initial = await read(c.planSchema, '/plan');
    const reply = await write(replyResponse, 'POST', '/coach/messages', { text: '30분 계획' });
    const component = reply.assistant.components.find((v) => v.type === 'PLAN_CHANGE');
    if (!component || component.type !== 'PLAN_CHANGE') throw new Error('Expected proposal');
    expect((await read(c.planSchema, '/plan')).revision).toBe(initial.revision);
    await write(c.proposalSchema, 'POST', `/coach/proposals/${component.proposal.id}`, {
      action: 'apply',
    });
    expect((await read(c.planSchema, '/plan')).revision).toBe(2);
    expect(
      (await request('POST', `/coach/proposals/${component.proposal.id}`, { action: 'apply' }))
        .status,
    ).toBe(409);
    const next = await write(replyResponse, 'POST', '/coach/messages', { text: '20분 계획' });
    const pending = next.assistant.components.find((v) => v.type === 'PLAN_CHANGE');
    if (!pending || pending.type !== 'PLAN_CHANGE') throw new Error('Expected proposal');
    await write(c.planSchema, 'PUT', '/plan', { ...(await planInput()), name: '수동 수정' });
    expect(
      (await request('POST', `/coach/proposals/${pending.proposal.id}`, { action: 'apply' }))
        .status,
    ).toBe(409);
    expect((await read(c.proposalSchema, `/coach/proposals/${pending.proposal.id}`)).status).toBe(
      'pending',
    );
  });
  it('retains paid/free histories across entitlement changes and reset', async () => {
    await write(replyResponse, 'POST', '/coach/messages', { text: '운동 기록 분석' });
    await connection.db.update(accounts).set({ paid: true }).where(eq(accounts.id, 'alice'));
    await write(replyResponse, 'POST', '/coach/messages', { text: '운동 기록 분석' });
    expect((await read(c.allowanceSchema, '/coach/usage')).remaining).toBe(99);
    await connection.db.update(accounts).set({ paid: false }).where(eq(accounts.id, 'alice'));
    expect((await read(c.allowanceSchema, '/coach/usage')).remaining).toBe(4);
    await request('POST', '/reset', { confirm: 'RESET' });
    expect((await read(c.allowanceSchema, '/coach/usage')).remaining).toBe(4);
    expect((await read(c.listSchema(c.messageSchema), '/coach/messages')).total).toBe(1);
  });
  it('invalidates old response receipts on reset without replaying old mutations', async () => {
    const key = randomUUID();
    const body = { baseRevision: 0, date: '2026-09-08', weight: 70 };
    await write(c.metricSchema, 'PUT', '/metrics', body, key);
    const resetKey = randomUUID();
    const reset = await request('POST', '/reset', { confirm: 'RESET' }, 'alice', resetKey);
    expect(reset.status).toBe(200);
    expect((await request('POST', '/reset', { confirm: 'RESET' }, 'alice', resetKey)).status).toBe(
      200,
    );
    const old = await request('PUT', '/metrics', body, 'alice', key);
    expect(old.status).toBe(409);
    expect(c.errorSchema.parse(await old.json()).error.code).toBe('REQUEST_INVALIDATED');
    expect((await read(c.listSchema(c.metricSchema), '/metrics')).total).toBe(0);
  });
  it('handles the 15-day and monthly boundaries in the stored timezone', () => {
    const usage: c.Usage = {
      free: { start: '2026-08-17T00:00:00Z', used: 5 },
      paid: { start: '2026-07-31T15:00:00.000Z', used: 100 },
      corrections: 0,
      canCorrect: false,
      timeZone: 'Asia/Seoul',
    };
    expect(allowance(usage, false, new Date('2026-08-31T23:59:59Z')).remaining).toBe(0);
    expect(allowance(usage, false, new Date('2026-09-01T00:00:00Z')).remaining).toBe(5);
    expect(allowance(usage, true, new Date('2026-08-31T14:59:59Z')).remaining).toBe(0);
    expect(allowance(usage, true, new Date('2026-08-31T15:00:00Z')).remaining).toBe(100);
  });
});
describe('configuration and time', () => {
  it('verifies OIDC signatures, issuer, audience and token expiry', async () => {
    const { publicKey, privateKey } = await generateKeyPair('RS256');
    const jwk = { ...(await exportJWK(publicKey)), kid: 'test-key', alg: 'RS256', use: 'sig' };
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () =>
        new Response(JSON.stringify({ keys: [jwk] }), {
          headers: { 'content-type': 'application/json' },
        }),
    );
    try {
      const config = readConfig({
        AUTH_MODE: 'oidc',
        OIDC_ISSUER: 'https://identity.example',
        OIDC_AUDIENCE: 'heyaz-api',
        OIDC_JWKS_URL: 'https://identity.example/jwks',
      });
      const authenticate = createAuthenticator(config);
      const token = (
        issuer = config.OIDC_ISSUER!,
        audience = 'heyaz-api',
        expiration: string | number = '5m',
      ) =>
        new SignJWT({})
          .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
          .setIssuer(issuer)
          .setAudience(audience)
          .setSubject('user-123')
          .setIssuedAt()
          .setExpirationTime(expiration)
          .sign(privateKey);
      const request = async (value: Promise<string>) =>
        new Request('https://api.example', { headers: { authorization: `Bearer ${await value}` } });
      await expect(authenticate(await request(token()))).resolves.toMatch(/^[a-f0-9]{64}$/);
      await expect(authenticate(await request(token('https://other.example')))).rejects.toThrow();
      await expect(authenticate(await request(token(undefined, 'another-api')))).rejects.toThrow();
      await expect(authenticate(await request(token(undefined, undefined, 1)))).rejects.toThrow();
    } finally {
      fetch.mockRestore();
    }
  });
  it('refuses development authentication in production or on a public interface', () => {
    expect(() => readConfig({ NODE_ENV: 'production' })).toThrow();
    expect(() => readConfig({ HOST: '0.0.0.0' })).toThrow();
    expect(() => readConfig({ AUTH_MODE: 'oidc' })).toThrow();
    expect(() => readConfig({ CORS_ORIGINS: '*' })).toThrow();
  });
  it('checks the configured development token without accepting arbitrary identity headers', async () => {
    const auth = createAuthenticator(readConfig({}));
    await expect(
      auth(new Request('http://localhost', { headers: { 'x-user-id': 'alice' } })),
    ).rejects.toThrow();
    await expect(
      auth(new Request('http://localhost', { headers: { authorization: 'Bearer wrong' } })),
    ).rejects.toThrow();
    await expect(
      auth(
        new Request('http://localhost', {
          headers: { authorization: 'Bearer heyaz-local-development-only-token' },
        }),
      ),
    ).resolves.toBe('development-user');
  });
  it('handles date boundaries and rejects ambiguous/nonexistent DST local times', () => {
    expect(localDate(new Date('2026-09-08T15:00:00Z'), 'Asia/Seoul')).toBe('2026-09-09');
    expect(atLocal('2026-09-09', '09:00', 'Asia/Seoul').toISOString()).toBe(
      '2026-09-09T00:00:00.000Z',
    );
    expect(() => atLocal('2026-03-08', '02:30', 'America/New_York')).toThrow();
    expect(() => atLocal('2026-11-01', '01:30', 'America/New_York')).toThrow();
  });
});
