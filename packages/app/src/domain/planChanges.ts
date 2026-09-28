import type { PlannedExercise, WorkoutPlan } from '../types';
export interface PlanDelta {
  dayOfWeek: number;
  kind: 'added' | 'removed' | 'updated' | 'moved' | 'schedule';
  exercise?: PlannedExercise;
  previous?: PlannedExercise;
  beforeId?: string;
  afterId?: string;
  description?: string;
}
export function planChanges(before: WorkoutPlan, after: WorkoutPlan): PlanDelta[] {
  const result: PlanDelta[] = [];
  for (const day of after.days) {
    const old = before.days.find((d) => d.dayOfWeek === day.dayOfWeek);
    day.exercises.forEach((exercise, index) => {
      const previous = old?.exercises.find((e) => e.id === exercise.id);
      const changed =
        previous &&
        ['exerciseId', 'sets', 'reps', 'weight', 'duration', 'restSeconds'].some(
          (key) =>
            previous[key as keyof PlannedExercise] !== exercise[key as keyof PlannedExercise],
        );
      const oldOrder =
        old?.exercises.filter((e) => day.exercises.some((n) => n.id === e.id)).map((e) => e.id) ??
        [];
      const newOrder = day.exercises.filter((e) => oldOrder.includes(e.id)).map((e) => e.id);
      const moved = previous && oldOrder.indexOf(exercise.id) !== newOrder.indexOf(exercise.id);
      if (!previous || changed || moved)
        result.push({
          dayOfWeek: day.dayOfWeek,
          kind: !previous ? 'added' : changed ? 'updated' : 'moved',
          exercise,
          previous,
          beforeId: day.exercises[index - 1]?.exerciseId,
          afterId: day.exercises[index + 1]?.exerciseId,
        });
    });
    old?.exercises
      .filter((e) => !day.exercises.some((n) => n.id === e.id))
      .forEach((exercise) => result.push({ dayOfWeek: day.dayOfWeek, kind: 'removed', exercise }));
    if (
      old &&
      (old.startTime !== day.startTime ||
        old.estimatedDuration !== day.estimatedDuration ||
        old.title !== day.title)
    )
      result.push({
        dayOfWeek: day.dayOfWeek,
        kind: 'schedule',
        description: `${day.title} · ${old.startTime} → ${day.startTime} · ${old.estimatedDuration}분 → ${day.estimatedDuration}분`,
      });
  }
  before.days
    .filter((day) => !after.days.some((d) => d.dayOfWeek === day.dayOfWeek))
    .forEach((day) =>
      result.push({
        dayOfWeek: day.dayOfWeek,
        kind: 'schedule',
        description: `${day.title} · 운동일 삭제`,
      }),
    );
  return result;
}
