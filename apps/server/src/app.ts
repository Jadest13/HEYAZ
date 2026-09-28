import { createHash } from 'node:crypto';
import { OpenAPIHono } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { requestId } from 'hono/request-id';
import { bodyLimit } from 'hono/body-limit';
import { logger } from 'hono/logger';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import * as c from '@heyaz/contracts';
import { ApiError } from './errors.js';
import { Repository, type UserStore, type ResourceKind } from './db/store.js';
import type { Authenticate } from './auth.js';
import { seed } from './seed.js';
import * as workouts from './services/workouts.js';
import * as burning from './services/burning.js';
import * as reports from './services/reports.js';
import * as coach from './services/coach.js';
import { addDays, localDate } from './time.js';
type Env = { Variables: { requestId: string; userId: string } };
export interface AppOptions {
  repository: Repository;
  authenticate: Authenticate;
  origins?: string[];
  coach?: coach.CoachProvider;
  now?: () => Date;
  logging?: boolean;
  random?: () => number;
}
const empty = z.strictObject({});
function parse<S extends z.ZodType>(schema: S, value: unknown): z.output<S> {
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw new ApiError(
      422,
      'VALIDATION_ERROR',
      '입력값을 확인해주세요.',
      parsed.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    );
  return parsed.data;
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object')
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}
export function createApp(options: AppOptions) {
  const app = new OpenAPIHono<Env>();
  app.use('*', requestId(), secureHeaders());
  app.use('*', async (context, next) => {
    context.header('Cache-Control', 'no-store');
    await next();
  });
  if (options.logging) app.use('*', logger());
  app.use(
    '*',
    cors({
      origin: options.origins ?? [],
      allowMethods: ['GET', 'POST', 'PUT', 'OPTIONS'],
      allowHeaders: ['Authorization', 'Content-Type', 'Idempotency-Key'],
      exposeHeaders: ['X-Request-Id'],
      maxAge: 600,
    }),
  );
  app.use('/api/v1/*', async (context, next) => {
    const origin = context.req.header('Origin');
    if (origin && !(options.origins ?? []).includes(origin))
      throw new ApiError(403, 'ORIGIN_NOT_ALLOWED', '허용되지 않은 요청 출처입니다.');
    context.set('userId', await options.authenticate(context.req.raw));
    await next();
  });
  app.use(
    '*',
    bodyLimit({
      maxSize: 256 * 1024,
      onError: () => {
        throw new ApiError(413, 'BODY_TOO_LARGE', '요청 본문은 256KB 이하여야 합니다.');
      },
    }),
  );
  app.onError((error, context) => {
    const status =
      error instanceof ApiError
        ? error.status
        : error instanceof HTTPException
          ? error.status
          : 500;
    if (status === 401) context.header('WWW-Authenticate', 'Bearer');
    if (status >= 500 && options.logging)
      console.error(
        JSON.stringify({
          requestId: context.get('requestId'),
          event: 'request_failed',
          status,
          errorType: error.name,
        }),
      );
    return context.json(
      {
        error: {
          code:
            error instanceof ApiError
              ? error.code
              : status === 500
                ? 'INTERNAL_ERROR'
                : 'HTTP_ERROR',
          message:
            error instanceof ApiError
              ? error.message
              : status === 500
                ? '요청 처리 중 오류가 발생했습니다.'
                : '요청 형식을 확인해주세요.',
          requestId: context.get('requestId'),
          ...(error instanceof ApiError && error.details ? { details: error.details } : {}),
        },
      },
      status,
    );
  });
  app.notFound((context) =>
    context.json(
      {
        error: {
          code: 'NOT_FOUND',
          message: 'API 경로를 찾을 수 없습니다.',
          requestId: context.get('requestId'),
        },
      },
      404,
    ),
  );
  app.openAPIRegistry.registerComponent('securitySchemes', 'bearerAuth', {
    type: 'http',
    scheme: 'bearer',
  });
  app.get('/health', (context) => context.json({ status: 'ok' }));
  app.get('/ready', async (context) => {
    try {
      await options.repository.health();
      return context.json({ status: 'ok' });
    } catch {
      throw new ApiError(503, 'DATABASE_UNAVAILABLE', '저장소 연결을 확인해주세요.');
    }
  });

  function route<B extends z.ZodType, Q extends z.ZodObject, R extends z.ZodType>(definition: {
    method: 'get' | 'post' | 'put';
    path: string;
    summary: string;
    tag: string;
    body: B;
    query: Q;
    response: R;
    status?: 200 | 201;
    work: (args: {
      store: UserStore;
      body: z.output<B>;
      query: z.output<Q>;
      params: Record<string, string>;
      now: Date;
      requestKey: string;
    }) => Promise<z.output<R>>;
  }) {
    const { method, path, body, query, response } = definition;
    const write = method !== 'get',
      status = definition.status ?? 200;
    const paramShape = Object.fromEntries(
      [...path.matchAll(/\{(\w+)\}/g)].map(([, name]) => [name, c.idSchema]),
    );
    const paramsSchema = z.strictObject(paramShape);
    app.openAPIRegistry.registerPath({
      method,
      path: `/api/v1${path}`,
      summary: definition.summary,
      tags: [definition.tag],
      security: [{ bearerAuth: [] }],
      request: {
        params: paramsSchema,
        query,
        ...(write
          ? {
              headers: z.object({ 'Idempotency-Key': c.idSchema }),
              body: { required: true, content: { 'application/json': { schema: body } } },
            }
          : {}),
      },
      responses: {
        [status]: { description: 'Success', content: { 'application/json': { schema: response } } },
        ...Object.fromEntries(
          [400, 401, 403, 404, 409, 413, 415, 422, 429, 500, 503].map((code) => [
            code,
            { description: 'Error', content: { 'application/json': { schema: c.errorSchema } } },
          ]),
        ),
      },
    });
    app.on(method.toUpperCase(), `/api/v1${path.replace(/\{(\w+)\}/g, ':$1')}`, async (context) => {
      const params = parse(paramsSchema, context.req.param());
      const queryValues = context.req.queries();
      if (Object.values(queryValues).some((v) => v.length !== 1))
        throw new ApiError(422, 'DUPLICATE_QUERY', '같은 조회 항목을 여러 번 지정할 수 없습니다.');
      const queryInput = parse(query, context.req.query());
      let rawBody: unknown = {};
      let requestKey = '';
      if (write) {
        requestKey = parse(c.idSchema, context.req.header('Idempotency-Key'));
        if (!/^application\/json(?:\s*;|$)/i.test(context.req.header('content-type') ?? ''))
          throw new ApiError(415, 'JSON_REQUIRED', 'Content-Type: application/json이 필요합니다.');
        try {
          rawBody = await context.req.json();
        } catch {
          throw new ApiError(400, 'INVALID_JSON', 'JSON 본문을 읽을 수 없습니다.');
        }
      }
      const bodyInput = parse(body, rawBody);
      const fingerprint = createHash('sha256')
        .update(
          canonical({ method, path: context.req.path, query: context.req.query(), body: rawBody }),
        )
        .digest('hex');
      const result = await options.repository.run(
        context.get('userId'),
        async (store) => {
          const now = options.now?.() ?? new Date();
          await seed(store, now);
          const value = await definition.work({
            store,
            body: bodyInput,
            query: queryInput,
            params,
            now,
            requestKey,
          });
          // Validate before committing: an invalid provider/service response rolls back the write and usage charge.
          return response.parse(value);
        },
        write ? { key: requestKey, fingerprint } : undefined,
      );
      return context.newResponse(JSON.stringify(result), status, {
        'Content-Type': 'application/json; charset=UTF-8',
      });
    });
  }
  const get = <Q extends z.ZodObject, R extends z.ZodType>(
    path: string,
    summary: string,
    tag: string,
    query: Q,
    response: R,
    work: (args: {
      store: UserStore;
      query: z.output<Q>;
      params: Record<string, string>;
      now: Date;
    }) => Promise<z.output<R>>,
  ) => route({ method: 'get', path, summary, tag, body: empty, query, response, work });
  const write = <B extends z.ZodType, R extends z.ZodType>(
    method: 'post' | 'put',
    path: string,
    summary: string,
    tag: string,
    body: B,
    response: R,
    work: (args: {
      store: UserStore;
      body: z.output<B>;
      params: Record<string, string>;
      now: Date;
      requestKey: string;
    }) => Promise<z.output<R>>,
    status: 200 | 201 = 200,
  ) => route({ method, path, summary, tag, body, query: empty, response, work, status });
  const list = <S extends z.ZodType>(path: string, tag: string, kind: ResourceKind, schema: S) =>
    get(
      path,
      `${tag} 목록`,
      tag,
      c.listQuerySchema,
      c.listSchema(schema),
      async ({ store, query }) => {
        const values = await store.list(kind, schema);
        const items = values.filter((item) => {
          const record = item as { date?: string; createdAt?: string };
          const date = record.date ?? record.createdAt?.slice(0, 10);
          return (
            (!query.from || (!!date && date >= query.from)) &&
            (!query.to || (!!date && date <= query.to))
          );
        });
        return {
          items: items.slice(query.offset, query.offset + query.limit),
          total: items.length,
          limit: query.limit,
          offset: query.offset,
        };
      },
    );
  const exerciseSchema = z.object({
    id: c.exerciseIdSchema,
    name: z.string(),
    muscle: z.string(),
    equipment: z.string(),
    kind: z.enum(['strength', 'timed']),
    met: z.number(),
  });
  get('/exercises', '운동 목록', '운동', empty, z.array(exerciseSchema), async () => [
    ...c.exercises,
  ]);
  get('/profile', '내 프로필', '프로필', empty, c.profileSchema, ({ store }) =>
    workouts.getProfile(store),
  );
  write(
    'put',
    '/profile',
    '프로필 저장',
    '프로필',
    c.updateProfileSchema,
    c.profileSchema,
    ({ store, body }) => workouts.saveProfile(store, body),
  );
  get('/plan', '현재 반복 계획', '계획', empty, c.planSchema, ({ store }) =>
    workouts.getPlan(store),
  );
  write(
    'put',
    '/plan',
    '계획 편집 저장',
    '계획',
    c.updatePlanSchema,
    c.planSchema,
    ({ store, body, now }) => workouts.savePlan(store, body, now),
  );
  get('/dashboard', '홈 대시보드', '조회', empty, c.dashboardSchema, ({ store, now }) =>
    reports.dashboard(store, now),
  );
  list('/sessions', '운동 기록', 'session', c.sessionSchema);
  get(
    '/sessions/active',
    '진행 중 운동',
    '운동 기록',
    empty,
    c.sessionSchema.nullable(),
    async ({ store }) =>
      (await store.list('session', c.sessionSchema)).find((s) => s.status === 'active') ?? null,
  );
  get(
    '/sessions/{id}',
    '운동 상세와 결과',
    '운동 기록',
    empty,
    c.sessionResultSchema,
    async ({ store, params, now }) =>
      reports.sessionResult(
        await store.require('session', params.id, c.sessionSchema),
        (await workouts.getProfile(store)).weight,
        now,
      ),
  );
  write(
    'post',
    '/sessions',
    '운동 시작',
    '운동 기록',
    c.startSessionSchema,
    c.sessionSchema,
    ({ store, body, now }) => workouts.startSession(store, body, now),
    201,
  );
  write(
    'post',
    '/sessions/{id}/sets',
    '세트 완료·스킵',
    '운동 기록',
    c.recordInputSchema,
    c.sessionSchema,
    ({ store, params, body, now }) => workouts.recordSet(store, params.id, body, now),
  );
  write(
    'post',
    '/sessions/{id}/replace',
    '운동 교체',
    '운동 기록',
    c.replaceExerciseSchema,
    c.sessionSchema,
    ({ store, params, body }) => workouts.replaceExercise(store, params.id, body),
  );
  write(
    'post',
    '/sessions/{id}/rest',
    '휴식 연장·건너뛰기',
    '운동 기록',
    c.restInputSchema,
    c.sessionSchema,
    ({ store, params, body, now }) => workouts.rest(store, params.id, body, now),
  );
  write(
    'post',
    '/sessions/{id}/finish',
    '운동 종료',
    '운동 기록',
    c.revisionInputSchema,
    c.sessionSchema,
    ({ store, params, body, now }) =>
      workouts.finishSession(store, params.id, body.baseRevision, now),
  );
  list('/metrics', '신체 기록', 'metric', c.metricSchema);
  write(
    'put',
    '/metrics',
    '날짜별 신체 기록 교체',
    '신체 기록',
    c.metricInputSchema,
    c.metricSchema,
    ({ store, body, now }) => workouts.saveMetric(store, body, now),
  );
  list('/assessments', '체력 확인', 'assessment', c.assessmentSchema);
  write(
    'post',
    '/assessments',
    '체력 확인 결과 저장',
    '체력 확인',
    c.assessmentInputSchema,
    c.assessmentSchema,
    ({ store, body, now }) => workouts.saveAssessment(store, body, now),
    201,
  );
  list('/burning-days', 'Burning Day', 'burning', c.burningSchema);
  get(
    '/burning-days/active',
    '진행 중 Burning Day',
    'Burning Day',
    empty,
    c.burningSchema.nullable(),
    async ({ store }) =>
      (await store.list('burning', c.burningSchema)).find((s) => s.status === 'active') ?? null,
  );
  get(
    '/burning-days/{id}',
    'Burning Day 결과',
    'Burning Day',
    empty,
    c.burningResultSchema,
    async ({ store, params }) =>
      reports.burningResult(
        await store.require('burning', params.id, c.burningSchema),
        (await workouts.getProfile(store)).weight,
      ),
  );
  write(
    'post',
    '/burning-days',
    'Burning Day 시작',
    'Burning Day',
    c.burningInputSchema,
    c.burningSchema,
    ({ store, body, now }) => burning.startBurning(store, body, now, options.random),
    201,
  );
  write(
    'post',
    '/burning-days/{id}/events/{eventId}',
    '이벤트 편집·수행',
    'Burning Day',
    c.burningEventInputSchema,
    c.burningSchema,
    ({ store, params, body, now }) =>
      burning.changeEvent(store, params.id, params.eventId, body, now),
  );
  write(
    'post',
    '/burning-days/{id}/finish',
    'Burning Day 종료',
    'Burning Day',
    c.revisionInputSchema,
    c.burningSchema,
    ({ store, params, body }) => burning.finishBurning(store, params.id, body.baseRevision),
  );
  get(
    '/analytics',
    '기간별 운동 분석',
    '조회',
    c.analyticsQuerySchema,
    c.analyticsSchema,
    ({ store, query, now }) => reports.analytics(store, query.days, now),
  );
  const activityQuery = z
    .strictObject({ from: c.dateSchema, to: c.dateSchema })
    .refine(
      (v) =>
        c.dateSchema.safeParse(v.from).success &&
        c.dateSchema.safeParse(v.to).success &&
        v.to >= v.from &&
        v.to <= addDays(v.from, 365),
      '유효한 날짜로 최대 366일까지 조회할 수 있습니다.',
    );
  get(
    '/activity',
    '날짜별 활동 파동',
    '조회',
    activityQuery,
    z.array(c.activitySchema),
    ({ store, query }) => reports.activity(store, query.from, query.to),
  );
  get('/coach/usage', '코치 잔여 이용량', '코치', empty, c.allowanceSchema, ({ store, now }) =>
    coach.getAllowance(store, now),
  );
  get(
    '/coach/messages',
    '대화 기록',
    '코치',
    c.listQuerySchema,
    c.listSchema(c.messageSchema),
    async ({ store, query }) => {
      const timeZone = (await workouts.getProfile(store)).timeZone;
      const items = (await store.list('message', c.messageSchema))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
        .filter((m) => {
          const date = localDate(new Date(m.createdAt), timeZone);
          return (!query.from || date >= query.from) && (!query.to || date <= query.to);
        });
      return {
        items: items.slice(query.offset, query.offset + query.limit),
        total: items.length,
        limit: query.limit,
        offset: query.offset,
      };
    },
  );
  write(
    'post',
    '/coach/messages',
    '코치 질문·계획 제안',
    '코치',
    c.coachInputSchema,
    z.strictObject({
      user: c.messageSchema,
      assistant: c.messageSchema,
      allowance: c.allowanceSchema,
    }),
    ({ store, body, now, requestKey }) =>
      coach.sendMessage(store, body.text, now, requestKey, options.coach),
    201,
  );
  get(
    '/coach/proposals/{id}',
    '계획 제안 상세',
    '코치',
    empty,
    c.proposalSchema,
    ({ store, params }) => store.require('proposal', params.id, c.proposalSchema),
  );
  write(
    'post',
    '/coach/proposals/{id}',
    '계획 제안 승인·거절',
    '코치',
    c.proposalActionSchema,
    c.proposalSchema,
    ({ store, params, body, now }) => coach.decideProposal(store, params.id, body.action, now),
  );
  write(
    'post',
    '/reset',
    '운동 데이터 초기화 (이용량·권한 보존)',
    '설정',
    z.strictObject({ confirm: z.literal('RESET') }),
    z.strictObject({ reset: z.literal(true) }),
    async ({ store, now }) => {
      for (const kind of [
        'profile',
        'plan',
        'session',
        'metric',
        'assessment',
        'burning',
        'message',
        'proposal',
      ] as const)
        await store.clear(kind);
      await seed(store, now);
      const usage = await store.require('usage', 'current', c.usageSchema);
      await store.invalidateRequests();
      await store.put('usage', 'current', { ...usage, canCorrect: false, corrections: 0 });
      return { reset: true as const };
    },
  );
  app.doc('/openapi.json', {
    openapi: '3.0.0',
    info: {
      title: 'HEYAZ API',
      version: '1.0.0',
      description:
        '모든 변경 요청에 UUID Idempotency-Key가 필요합니다. 버전 충돌은 409로 반환합니다. 서버 API는 기존 로컬 AppState와 별도 계약입니다.',
    },
  });
  return app;
}
