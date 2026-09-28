import { expect, it } from 'vitest';
import { planDates, movePlanDate } from './planDates';
it('includes Sunday in the preceding Monday week across a year boundary', () => {
  expect(planDates('2027-01-03', 'week')).toEqual([
    '2026-12-28',
    '2026-12-29',
    '2026-12-30',
    '2026-12-31',
    '2027-01-01',
    '2027-01-02',
    '2027-01-03',
  ]);
});
it('handles leap months and clamps monthly navigation', () => {
  expect(planDates('2028-02-10', 'month')).toHaveLength(29);
  expect(movePlanDate('2028-01-31', 'month', 1)).toBe('2028-02-29');
  expect(movePlanDate('2026-01-31', 'month', 1)).toBe('2026-02-28');
});
