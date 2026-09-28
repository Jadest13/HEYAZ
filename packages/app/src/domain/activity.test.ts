import { expect, it } from 'vitest';
import { initialState } from '../mocks/initial';
import { dailyActivity } from './activity';
import { exerciseFields, normalizeExercise } from './exerciseFields';
it('distinguishes zero, partial, completed and additional exercise', () => {
  const state = initialState();
  state.sessions = [];
  state.burning = [];
  const date = '2026-09-08';
  expect(dailyActivity(state, date).level).toBe(0);
  state.sessions = [
    {
      id: 'a',
      date,
      startedAt: date,
      planRevision: 1,
      day: state.plan.days[0],
      status: 'partial',
      records: [
        {
          id: 'r',
          exerciseId: 'bench',
          set: 1,
          reps: 10,
          weight: 20,
          duration: 0,
          status: 'completed',
          completedAt: date,
        },
      ],
    },
  ];
  expect(dailyActivity(state, date).level).toBe(1);
  state.sessions[0].status = 'completed';
  expect(dailyActivity(state, date).level).toBe(2);
  state.sessions.push({ ...state.sessions[0], id: 'b', status: 'partial' });
  expect(dailyActivity(state, date).level).toBe(3);
});
it('does not count skipped sets or unperformed Burning Day as activity', () => {
  const state = initialState();
  state.burning = [
    {
      id: 'b',
      date: '2026-09-08',
      startTime: '09:00',
      endTime: '10:00',
      interval: 60,
      pool: ['squat'],
      status: 'ended',
      events: [
        { id: 'e', scheduledAt: 0, exerciseId: 'squat', reps: 10, duration: 30, status: 'skipped' },
      ],
    },
  ];
  expect(dailyActivity(state, '2026-09-08').burning).toBe(false);
  state.burning[0].events[0].status = 'partial';
  expect(dailyActivity(state, '2026-09-08').burning).toBe(true);
});
it('uses the appropriate fields and removes irrelevant values on replacement', () => {
  expect(exerciseFields('bench')).toEqual(['sets', 'reps', 'weight', 'restSeconds']);
  expect(exerciseFields('plank')).toEqual(['sets', 'duration', 'restSeconds']);
  expect(exerciseFields('pushup')).toEqual(['sets', 'reps', 'restSeconds']);
  const value = normalizeExercise({
    id: 'e',
    exerciseId: 'plank',
    sets: 3,
    reps: 10,
    weight: 50,
    duration: 30,
    restSeconds: 60,
  });
  expect(value.weight).toBe(0);
  expect(value.reps).toBe(0);
});
