import { exerciseById } from '../constants/exercises';
import type { PlannedExercise } from '../types';
export type ExerciseField = 'sets' | 'reps' | 'weight' | 'duration' | 'restSeconds';
export const fieldLabels: Record<ExerciseField, string> = {
  sets: '세트',
  reps: '횟수',
  weight: '중량(kg)',
  duration: '시간(초)',
  restSeconds: '휴식(초)',
};
export function exerciseFields(id: string): ExerciseField[] {
  const e = exerciseById(id);
  return e.kind === 'timed'
    ? ['sets', 'duration', 'restSeconds']
    : e.equipment === '맨몸'
      ? ['sets', 'reps', 'restSeconds']
      : ['sets', 'reps', 'weight', 'restSeconds'];
}
export function normalizeExercise(e: PlannedExercise): PlannedExercise {
  const fields = exerciseFields(e.exerciseId);
  return {
    ...e,
    weight: fields.includes('weight') ? e.weight : 0,
    reps: fields.includes('reps') ? Math.max(1, e.reps) : 0,
    duration: fields.includes('duration') ? Math.max(1, e.duration) : 30,
  };
}
export function exerciseSummary(e: PlannedExercise) {
  return exerciseFields(e.exerciseId)
    .map(
      (f) =>
        `${e[f]}${{ sets: '세트', reps: '회', weight: 'kg', duration: '초', restSeconds: '초 휴식' }[f]}`,
    )
    .join(' · ');
}
