export function changePercent(value: number, baseline: number): number | null {
  return baseline === 0 ? null : ((value - baseline) / baseline) * 100;
}
export function chartBounds(values: number[], relative: boolean) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = Math.max((max - min) * 0.15, relative ? 0.15 : 0.1);
  return { lower: relative ? min - padding : Math.max(0, min - padding), upper: max + padding };
}
