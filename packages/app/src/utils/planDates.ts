import { localDate } from './date';
export function planDates(anchor: string, period: 'week' | 'month') {
  const date = new Date(`${anchor}T12:00:00`);
  const start = new Date(date);
  if (period === 'week') start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  else start.setDate(1);
  const count =
    period === 'week' ? 7 : new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  return Array.from({ length: count }, (_, i) => {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    return localDate(day);
  });
}
export function movePlanDate(anchor: string, period: 'week' | 'month', direction: number) {
  const date = new Date(`${anchor}T12:00:00`);
  if (period === 'week') date.setDate(date.getDate() + direction * 7);
  else {
    const day = date.getDate();
    date.setDate(1);
    date.setMonth(date.getMonth() + direction);
    date.setDate(Math.min(day, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()));
  }
  return localDate(date);
}
