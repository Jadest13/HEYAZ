import { z } from 'zod';
import { exercises, exerciseIds } from './catalog.js';
export { exercises } from './catalog.js';

export const idSchema = z.uuid();
export const dateSchema = z.iso.date();
export const instantSchema = z.iso.datetime({ offset: true });
export const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const timeZoneSchema = z
  .string()
  .min(1)
  .max(100)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat('en', { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, '유효한 IANA 시간대가 필요합니다.');
export const revisionSchema = z.number().int().positive();
const title = z.string().trim().min(1).max(100);
const finite = (min: number, max: number) => z.number().min(min).max(max);
export const exerciseIdSchema = z.enum(exerciseIds);
export const goalSchema = z.enum(['strength', 'fat-loss', 'fitness']);
export const profileInputSchema = z.strictObject({
  name: z.string().trim().min(1).max(30),
  goal: goalSchema,
  height: finite(100, 250),
  weight: finite(20, 400),
  targetWeight: finite(20, 400),
  experience: z.enum(['beginner', 'intermediate', 'advanced']),
  days: z
    .array(z.number().int().min(0).max(6))
    .min(1)
    .max(7)
    .refine((v) => new Set(v).size === v.length, '요일이 중복됩니다.'),
  minutes: finite(10, 180).int(),
  location: z.enum(['헬스장', '집', '야외']),
  equipment: z.string().max(500),
  excluded: z.string().max(500),
  notifications: z.boolean(),
  timeZone: timeZoneSchema,
});
export const profileSchema = profileInputSchema.extend({
  onboarded: z.boolean(),
  revision: revisionSchema,
});
export const updateProfileSchema = profileInputSchema.extend({ baseRevision: revisionSchema });

export const plannedExerciseSchema = z
  .strictObject({
    id: idSchema,
    exerciseId: exerciseIdSchema,
    sets: finite(1, 20).int(),
    reps: finite(0, 500).int(),
    weight: finite(0, 1000),
    duration: finite(1, 7200).int(),
    restSeconds: finite(0, 1800).int(),
  })
  .superRefine((value, ctx) => {
    const exercise = exercises.find((e) => e.id === value.exerciseId)!;
    if (exercise.kind === 'strength' && value.reps < 1)
      ctx.addIssue({
        code: 'custom',
        path: ['reps'],
        message: '근력 운동은 1회 이상이어야 합니다.',
      });
    if (exercise.kind === 'timed' && value.reps !== 0)
      ctx.addIssue({ code: 'custom', path: ['reps'], message: '시간 운동의 횟수는 0입니다.' });
    if (exercise.equipment === '맨몸' && value.weight !== 0)
      ctx.addIssue({ code: 'custom', path: ['weight'], message: '맨몸 운동의 중량은 0입니다.' });
  });
export const daySchema = z.strictObject({
  id: idSchema,
  dayOfWeek: finite(0, 6).int(),
  startTime: timeSchema,
  title,
  estimatedDuration: finite(1, 300).int(),
  exercises: z
    .array(plannedExerciseSchema)
    .min(1)
    .max(50)
    .refine(
      (items) => new Set(items.map((i) => i.id)).size === items.length,
      '운동 항목 ID가 중복됩니다.',
    ),
});
export const planInputSchema = z
  .strictObject({
    name: title,
    startDate: dateSchema,
    endDate: dateSchema.optional(),
    goal: goalSchema,
    days: z.array(daySchema).min(1).max(7),
  })
  .superRefine((value, ctx) => {
    if (value.endDate && value.endDate < value.startDate)
      ctx.addIssue({
        code: 'custom',
        path: ['endDate'],
        message: '종료일은 시작일 이후여야 합니다.',
      });
    if (new Set(value.days.map((d) => d.dayOfWeek)).size !== value.days.length)
      ctx.addIssue({ code: 'custom', path: ['days'], message: '요일이 중복됩니다.' });
    if (new Set(value.days.map((d) => d.id)).size !== value.days.length)
      ctx.addIssue({ code: 'custom', path: ['days'], message: '운동일 ID가 중복됩니다.' });
  });
export const planSchema = planInputSchema.safeExtend({
  id: idSchema,
  createdBy: z.enum(['AI', 'USER']),
  createdAt: instantSchema,
  updatedAt: instantSchema,
  revision: revisionSchema,
});
export const updatePlanSchema = planInputSchema.safeExtend({ baseRevision: revisionSchema });
export const recordInputSchema = z.strictObject({
  baseRevision: revisionSchema,
  plannedExerciseId: idSchema,
  set: finite(1, 20).int(),
  status: z.enum(['completed', 'skipped']),
  reps: finite(0, 500).int(),
  weight: finite(0, 1000).multipleOf(0.5),
  duration: finite(0, 7200).int(),
  rpe: finite(1, 10).multipleOf(0.5).optional(),
});
export const recordSchema = recordInputSchema.omit({ baseRevision: true }).extend({
  id: idSchema,
  exerciseId: exerciseIdSchema,
  completedAt: instantSchema,
});
export const sessionSchema = z.strictObject({
  id: idSchema,
  revision: revisionSchema,
  date: dateSchema,
  timeZone: timeZoneSchema,
  startedAt: instantSchema,
  endedAt: instantSchema.optional(),
  planRevision: revisionSchema,
  day: daySchema,
  records: z.array(recordSchema),
  status: z.enum(['active', 'completed', 'partial']),
  restUntil: instantSchema.optional(),
});
export const startSessionSchema = z.strictObject({ dayId: idSchema, planRevision: revisionSchema });
export const revisionInputSchema = z.strictObject({ baseRevision: revisionSchema });
export const replaceExerciseSchema = revisionInputSchema.extend({
  plannedExerciseId: idSchema,
  exerciseId: exerciseIdSchema,
});
export const restInputSchema = revisionInputSchema.extend({ action: z.enum(['extend', 'skip']) });
export const metricInputSchema = z.strictObject({
  baseRevision: z.number().int().nonnegative(),
  date: dateSchema,
  weight: finite(20, 400),
  bodyFatPercentage: finite(1, 70).optional(),
  skeletalMuscleMass: finite(1, 150).optional(),
});
export const metricSchema = metricInputSchema.omit({ baseRevision: true }).extend({
  id: idSchema,
  revision: revisionSchema,
  height: finite(100, 250),
  bmi: z.number().positive(),
});
export const assessmentInputSchema = z.strictObject({
  records: z
    .array(plannedExerciseSchema)
    .min(1)
    .max(50)
    .refine(
      (items) => new Set(items.map((i) => i.id)).size === items.length,
      '운동 항목 ID가 중복됩니다.',
    ),
});
export const assessmentSchema = assessmentInputSchema.extend({
  id: idSchema,
  date: dateSchema,
  summary: z.string(),
});
export const burningInputSchema = z
  .strictObject({
    startTime: timeSchema,
    endTime: timeSchema,
    interval: finite(5, 240).int(),
    pool: z
      .array(exerciseIdSchema)
      .min(1)
      .max(exerciseIds.length)
      .refine((ids) => new Set(ids).size === ids.length, '운동 풀이 중복됩니다.'),
  })
  .refine((value) => value.endTime > value.startTime, '종료 시각은 시작 이후여야 합니다.');
export const burningEventSchema = z.strictObject({
  id: idSchema,
  scheduledAt: instantSchema,
  exerciseId: exerciseIdSchema,
  reps: finite(1, 100).int(),
  duration: finite(5, 600).int(),
  status: z.enum(['pending', 'completed', 'partial', 'skipped']),
});
export const burningSchema = burningInputSchema.safeExtend({
  id: idSchema,
  revision: revisionSchema,
  date: dateSchema,
  timeZone: timeZoneSchema,
  events: z.array(burningEventSchema),
  status: z.enum(['active', 'ended']),
});
export const burningEventInputSchema = revisionInputSchema
  .extend({
    action: z.enum(['update', 'replace', 'completed', 'partial', 'skipped']),
    reps: finite(1, 100).int().optional(),
    duration: finite(5, 600).int().optional(),
  })
  .refine(
    (v) =>
      v.action === 'update'
        ? v.reps !== undefined || v.duration !== undefined
        : v.reps === undefined && v.duration === undefined,
    '수치 변경은 update에만 지정해주세요.',
  );
export const proposalSchema = z.strictObject({
  id: idSchema,
  baseRevision: revisionSchema,
  before: planSchema,
  after: planSchema,
  reason: z.string().min(1).max(2000),
  status: z.enum(['pending', 'applied', 'rejected']),
});
export const componentSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('INSIGHT'), text: z.string().max(10000) }),
  z.strictObject({ type: z.literal('PLAN_CHANGE'), proposal: proposalSchema }),
  z.strictObject({ type: z.literal('CHOICE'), options: z.array(z.string().max(2000)).max(10) }),
]);
export const messageSchema = z.strictObject({
  id: idSchema,
  role: z.enum(['assistant', 'user']),
  text: z.string().max(10000),
  components: z.array(componentSchema).max(10),
  createdAt: instantSchema,
  outcome: z.enum(['answer', 'off-topic', 'clarification']).optional(),
});
export const coachInputSchema = z.strictObject({ text: z.string().trim().min(1).max(2000) });
export const proposalActionSchema = z.strictObject({ action: z.enum(['apply', 'reject']) });
export const usageSchema = z.strictObject({
  free: z.strictObject({ start: instantSchema.nullable(), used: z.number().int().nonnegative() }),
  paid: z.strictObject({ start: instantSchema.nullable(), used: z.number().int().nonnegative() }),
  corrections: finite(0, 3).int(),
  canCorrect: z.boolean(),
  timeZone: timeZoneSchema,
});
export const allowanceSchema = z.strictObject({
  plan: z.enum(['free', 'paid']),
  limit: z.number().int(),
  remaining: z.number().int().nonnegative(),
  freeCorrection: z.boolean(),
  resetAt: instantSchema.nullable(),
  usage: usageSchema,
});
export const errorSchema = z.strictObject({
  error: z.strictObject({
    code: z.string(),
    message: z.string(),
    requestId: z.string(),
    details: z.array(z.strictObject({ path: z.string(), message: z.string() })).optional(),
  }),
});
export const listQuerySchema = z
  .strictObject({
    from: dateSchema.optional(),
    to: dateSchema.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).max(100000).default(0),
  })
  .refine(
    (value) => !value.from || !value.to || value.from <= value.to,
    '조회 기간을 확인해주세요.',
  );
export const listSchema = <S extends z.ZodType>(item: S) =>
  z.strictObject({
    items: z.array(item),
    total: z.number().int(),
    limit: z.number().int(),
    offset: z.number().int(),
  });
export const analyticsQuerySchema = z.strictObject({
  days: z.coerce
    .number()
    .pipe(z.union([z.literal(7), z.literal(30), z.literal(90)]))
    .default(30),
});
export const calorieSchema = z.strictObject({ min: z.number(), max: z.number() });
export const sessionResultSchema = z.strictObject({
  session: sessionSchema,
  minutes: z.number(),
  volume: z.number(),
  calories: calorieSchema,
});
export const burningResultSchema = z.strictObject({
  session: burningSchema,
  total: z.number(),
  completed: z.number(),
  partial: z.number(),
  skipped: z.number(),
  completionRate: z.number(),
  estimatedMinutes: z.number(),
  calories: calorieSchema,
});
export const analyticsSchema = z.strictObject({
  from: dateSchema,
  to: dateSchema,
  sessionCount: z.number(),
  workoutDays: z.number(),
  totalMinutes: z.number(),
  volume: z.number(),
  calories: calorieSchema,
  burningCompleted: z.number(),
  trend: z.array(z.strictObject({ sessionId: idSchema, date: dateSchema, volume: z.number() })),
  bestWeights: z.array(z.strictObject({ exerciseId: exerciseIdSchema, weight: z.number() })),
});
export const activitySchema = z.strictObject({
  date: dateSchema,
  status: z.enum(['none', 'partial', 'completed', 'extra']),
  burning: z.boolean(),
});
export const dashboardSchema = z.strictObject({
  today: dateSchema,
  routine: daySchema,
  routineDate: dateSchema,
  activeSession: sessionSchema.nullable(),
  week: z.strictObject({
    from: dateSchema,
    to: dateSchema,
    sessionCount: z.number(),
    workoutDays: z.number(),
    targetDays: z.number(),
    achievement: z.number(),
  }),
  totalSessions: z.number(),
  todayMetric: metricSchema.nullable(),
});
export type Profile = z.infer<typeof profileSchema>;
export type Plan = z.infer<typeof planSchema>;
export type PlannedExercise = z.infer<typeof plannedExerciseSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type BurningSession = z.infer<typeof burningSchema>;
export type Message = z.infer<typeof messageSchema>;
export type Proposal = z.infer<typeof proposalSchema>;
export type Usage = z.infer<typeof usageSchema>;
