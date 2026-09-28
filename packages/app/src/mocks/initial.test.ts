import { expect, it } from 'vitest';
import { fillDemoData, initialState } from './initial';
import { localDate } from '../utils/date';

it('provides completed, partial and extra activity plus body measurements without future records', () => {
  const state = initialState();
  expect(state.sessions.some((s) => s.status === 'partial')).toBe(true);
  expect(state.sessions.some((s) => s.id.startsWith('demo-extra-'))).toBe(true);
  expect(
    state.sessions.every(
      (s) => s.date < localDate() && Date.parse(s.endedAt!) > Date.parse(s.startedAt),
    ),
  ).toBe(true);
  expect(state.metrics.length).toBeGreaterThan(10);
  expect(state.metrics.every((m) => m.bodyFatPercentage && m.skeletalMuscleMass)).toBe(true);
});
it('fills empty legacy data once and preserves existing user records', () => {
  const state = initialState();
  delete state.demoDataVersion;
  const records = [{ ...state.sessions[0], id: 'user-record' }];
  state.sessions = records;
  state.metrics = [];
  const migrated = fillDemoData(state);
  expect(migrated.sessions).toBe(records);
  expect(migrated.metrics.length).toBeGreaterThan(0);
  expect(fillDemoData({ ...migrated, metrics: [] }).metrics).toEqual([]);
});
