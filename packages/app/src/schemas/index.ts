import { z } from 'zod';
export const plannedExerciseSchema = z.object({
  id: z.string(),
  exerciseId: z.string(),
  sets: z.number().int().min(1).max(20),
  reps: z.number().min(0).max(500),
  weight: z.number().min(0).max(1000),
  duration: z.number().positive().max(7200),
  restSeconds: z.number().min(0).max(1800),
});
export const planSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  startDate: z.string(),
  endDate: z.string().optional(),
  goal: z.enum(['strength', 'fat-loss', 'fitness']),
  createdBy: z.enum(['AI', 'USER']),
  createdAt: z.string(),
  updatedAt: z.string(),
  revision: z.number().int().positive(),
  days: z
    .array(
      z.object({
        id: z.string(),
        dayOfWeek: z.number().int().min(0).max(6),
        startTime: z.string(),
        title: z.string(),
        estimatedDuration: z.number().positive(),
        exercises: z.array(plannedExerciseSchema).min(1),
      }),
    )
    .min(1),
});
