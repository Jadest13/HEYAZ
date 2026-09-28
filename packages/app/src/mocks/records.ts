import type { AppState, WorkoutSession, BodyMetric, BurningDaySession } from '../types';
import { clone } from '../utils/clone';
import { localDate } from '../utils/date';

// Relative dates keep the demo useful when opening it in a different month.
export function demoRecords(state: AppState) {
  const sessions: WorkoutSession[] = [];
  const metrics: BodyMetric[] = [];
  const burning: BurningDaySession[] = [];
  const dateAgo = (offset: number) => {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    return localDate(date);
  };
  for (let offset = 56; offset >= 1; offset--) {
    const date = dateAgo(offset);
    if (offset % 7 === 0 || offset % 7 === 2 || offset % 7 === 4 || offset === 1) {
      const index = sessions.length;
      const day = clone(state.plan.days[index % state.plan.days.length]);
      const partial = index % 6 === 2;
      day.dayOfWeek = new Date(`${date}T12:00:00`).getDay();
      day.exercises = day.exercises.map((e) => ({
        ...e,
        weight: e.weight ? e.weight + Math.floor(index / 8) * 2 : 0,
      }));
      const startedAt = new Date(`${date}T19:00:00`).toISOString();
      const endedAt = new Date(
        Date.parse(startedAt) + (partial ? 22 : day.estimatedDuration) * 60000,
      ).toISOString();
      const records = day.exercises.flatMap((e) =>
        Array.from({ length: e.sets }, (_, i) => ({
          id: `demo-set-${date}-${e.id}-${i}`,
          exerciseId: e.exerciseId,
          set: i + 1,
          reps: e.reps,
          weight: e.weight,
          duration: e.duration,
          status: 'completed' as const,
          completedAt: endedAt,
        })),
      );
      sessions.push({
        id: `demo-session-${date}`,
        date,
        startedAt,
        endedAt,
        day,
        planRevision: state.plan.revision,
        records: partial ? records.slice(0, Math.ceil(records.length / 2)) : records,
        status: partial ? 'partial' : 'completed',
      });
      if (index % 5 === 3 && !partial) {
        const exercise = {
          id: `demo-walk-${date}`,
          exerciseId: 'walk',
          sets: 1,
          reps: 0,
          weight: 0,
          duration: 900,
          restSeconds: 0,
        };
        sessions.push({
          id: `demo-extra-${date}`,
          date,
          startedAt: new Date(`${date}T20:00:00`).toISOString(),
          endedAt: new Date(`${date}T20:15:00`).toISOString(),
          planRevision: state.plan.revision,
          status: 'completed',
          day: {
            ...day,
            id: `demo-extra-day-${date}`,
            title: '저녁 산책 · 유산소',
            startTime: '20:00',
            estimatedDuration: 15,
            exercises: [exercise],
          },
          records: [
            {
              ...exercise,
              id: `demo-extra-record-${date}`,
              set: 1,
              status: 'completed',
              completedAt: new Date(`${date}T20:15:00`).toISOString(),
            },
          ],
        });
      }
    }
    if (offset % 4 === 1) {
      const pool = ['squat', 'plank', 'jump', 'lunge'];
      burning.push({
        id: `demo-burning-${date}`,
        date,
        startTime: '09:00',
        endTime: '13:00',
        interval: 60,
        pool,
        status: 'ended',
        events: pool.map((exerciseId, i) => ({
          id: `demo-event-${date}-${i}`,
          exerciseId,
          scheduledAt: new Date(`${date}T${String(9 + i).padStart(2, '0')}:00:00`).getTime(),
          reps: 15,
          duration: 45,
          status: i === 3 ? 'skipped' : i === 2 ? 'partial' : 'completed',
        })),
      });
    }
    if (offset % 3 === 1) {
      const weight = Number(
        (state.profile.weight + offset * 0.035 + (offset % 4) * 0.08).toFixed(1),
      );
      metrics.push({
        id: `demo-metric-${date}`,
        date,
        weight,
        height: state.profile.height,
        bmi: Number((weight / (state.profile.height / 100) ** 2).toFixed(1)),
        bodyFatPercentage: Number((21 + offset * 0.045).toFixed(1)),
        skeletalMuscleMass: Number((28.4 - offset * 0.013).toFixed(1)),
      });
    }
  }
  return { sessions, metrics, burning };
}
