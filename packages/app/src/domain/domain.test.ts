import { clone } from '@heyaz/app/utils/clone';
import { describe, it, expect } from 'vitest';
import { initialState } from '../mocks/initial';
import { applyPlan, createBurning, volume } from './index';
describe('plan changes', () => {
  it('rejects stale AI proposals without modifying user edits', () => {
    const state = initialState();
    const proposed = clone(state.plan);
    const edited = applyPlan(state, { ...state.plan, name: 'User edit' }, 1);
    expect(() => applyPlan(edited, proposed, 1)).toThrow('계획이 변경');
    expect(edited.plan.name).toBe('User edit');
  });
  it('preserves recorded snapshots when plans change', () => {
    const state = initialState();
    const day = clone(state.plan.days[0]);
    const revised = clone(state.plan);
    revised.days[0].exercises[0].weight = 80;
    applyPlan(state, revised, 1);
    expect(day.exercises[0].weight).toBe(20);
  });
  it('rejects duplicate weekdays', () => {
    const state = initialState();
    state.plan.days[1].dayOfWeek = state.plan.days[0].dayOfWeek;
    expect(() => applyPlan(state, state.plan, 1)).toThrow('같은 요일');
  });
});
describe('burning day', () => {
  it('creates hourly slots with exclusive end time', () => {
    const session = createBurning('09:00', '18:00', 60, ['squat', 'plank'], () => 0.5);
    expect(session.events).toHaveLength(9);
    expect(
      session.events.every((e, i) => !i || e.exerciseId !== session.events[i - 1].exerciseId),
    ).toBe(true);
  });
  it('rejects invalid ranges and empty pools', () => {
    expect(() => createBurning('18:00', '09:00', 60, ['squat'])).toThrow();
    expect(() => createBurning('09:00', '18:00', 0, ['squat'])).toThrow();
    expect(() => createBurning('09:00', '18:00', 60, [])).toThrow();
  });
});
it('excludes skipped sets from volume', () => {
  const s = initialState();
  expect(
    volume({
      id: 's',
      date: '2026-09-07',
      startedAt: new Date().toISOString(),
      planRevision: 1,
      day: s.plan.days[0],
      status: 'partial',
      records: [
        {
          id: 'r',
          exerciseId: 'bench',
          set: 1,
          reps: 10,
          weight: 20,
          duration: 0,
          status: 'skipped',
          completedAt: '',
        },
      ],
    }),
  ).toBe(0);
});
