import { expect, it } from 'vitest';
import { changePercent, chartBounds } from './bodyChart';
it('compares measurements in different units using the same percentage scale', () => {
  expect(changePercent(66, 60)).toBe(10);
  expect(changePercent(22, 20)).toBe(10);
  expect(changePercent(60, 60)).toBe(0);
  expect(changePercent(20, 0)).toBeNull();
});
it('keeps small and constant changes visible with finite nonzero chart bounds', () => {
  const small = chartBounds([0, 0.3], true);
  expect(small.upper - small.lower).toBeLessThan(1);
  const flat = chartBounds([65, 65], false);
  expect(flat.upper).toBeGreaterThan(flat.lower);
  expect(flat.lower).toBeLessThan(65);
});
