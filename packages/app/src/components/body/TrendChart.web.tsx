import { typography as t } from '@heyaz/app/styles/typography';
import { colors as c } from '../../styles';
import { Empty, Muted } from '../common/ui.web';
export function TrendChart({
  data,
  label,
  unit,
}: {
  data: { date: string; value: number }[];
  label: string;
  unit: string;
}) {
  if (!data.length) return <Empty>기록을 추가하면 {label} 추이가 표시됩니다.</Empty>;
  const min = Math.min(...data.map((d) => d.value));
  const max = Math.max(...data.map((d) => d.value));
  const range = max - min || 1;
  const points = data
    .map(
      (d, i) =>
        `${30 + (i / Math.max(1, data.length - 1)) * 540},${160 - ((d.value - min) / range) * 115}`,
    )
    .join(' ');
  return (
    <div>
      <svg
        viewBox="0 0 600 200"
        role="img"
        aria-label={`${label}: ${data.map((d) => `${d.date} ${d.value}${unit}`).join(', ')}`}
        style={{ width: '100%', maxHeight: 230, overflow: 'visible' }}
      >
        {[45, 100, 160].map((y) => (
          <line key={y} x1="30" x2="570" y1={y} y2={y} stroke={c.border} strokeDasharray="4 4" />
        ))}
        <polyline
          points={points}
          fill="none"
          stroke={c.accent}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {data.map((d, i) => (
          <circle
            key={`${d.date}-${i}`}
            cx={30 + (i / Math.max(1, data.length - 1)) * 540}
            cy={160 - ((d.value - min) / range) * 115}
            r="4"
            fill={c.accent}
          >
            <title>
              {d.date}: {d.value}
              {unit}
            </title>
          </circle>
        ))}
        <text x="30" y="190" fontSize={t.caption} fill={c.muted}>
          {data[0].date}
        </text>
        <text x="570" y="190" textAnchor="end" fontSize={t.caption} fill={c.muted}>
          {data.at(-1)?.date}
        </text>
      </svg>
      <Muted>
        최저 {min.toFixed(1)}
        {unit} · 최고 {max.toFixed(1)}
        {unit}
      </Muted>
    </div>
  );
}
