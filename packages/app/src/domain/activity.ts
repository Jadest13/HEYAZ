import type { AppState } from '../types';
export const activityLabels = ['운동 없음', '일부 수행', '운동 완료', '추가 운동'] as const;
export function dailyActivity(state: Pick<AppState, 'sessions' | 'burning'>, date: string) {
  const sessions = state.sessions.filter(
    (s) => s.date === date && s.records.some((r) => r.status === 'completed'),
  );
  const completed = sessions.filter((s) => s.status === 'completed');
  const level =
    completed.length && sessions.length > 1 ? 3 : completed.length ? 2 : sessions.length ? 1 : 0;
  const burning = state.burning.filter(
    (b) =>
      b.date === date && b.events.some((e) => e.status === 'completed' || e.status === 'partial'),
  );
  return {
    level: level as 0 | 1 | 2 | 3,
    burning: burning.length > 0,
    sessions,
    burns: burning,
    label: activityLabels[level],
  };
}
export function pulsePath(level: number) {
  const amplitude = [0, 7, 16, 27][level] ?? 0;
  return amplitude
    ? `M0 32 H28 L36 ${32 - amplitude * 0.3} L42 ${32 + amplitude * 0.3} L50 ${32 - amplitude} L58 ${32 + amplitude * 0.65} L65 32 H100`
    : 'M0 32 H100';
}
