import { useState } from 'react';
import type { BodyMetric } from '../../types';
import { colors as c } from '../../styles';
import { Button, Empty, Muted, Row, Grid, Between } from '../common/ui.web';
import { changePercent, chartBounds } from '../../domain/bodyChart';
export const metricOptions = {
  weight: { label: '체중', unit: 'kg', color: c.accent },
  bmi: { label: 'BMI', unit: '', color: c.green },
  skeletalMuscleMass: { label: '골격근량', unit: 'kg', color: c.purple },
  bodyFatPercentage: { label: '체지방률', unit: '%', color: c.activityIdle },
};
export type MetricKey = keyof typeof metricOptions;
export function BodyComparisonChart({
  data,
  selected,
}: {
  data: BodyMetric[];
  selected: MetricKey[];
}) {
  const [mode, setMode] = useState<'relative' | 'actual' | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const relative = mode ? mode === 'relative' : selected.length > 1;
  if (!selected.length) return <Empty>비교할 지표를 하나 이상 선택해주세요.</Empty>;
  const dates = [...data].sort((a, b) => a.date.localeCompare(b.date));
  if (!dates.length || !dates.some((d) => selected.some((k) => d[k] !== undefined)))
    return <Empty>선택한 지표의 측정 기록이 없습니다.</Empty>;
  const first = Date.parse(dates[0].date);
  const last = Date.parse(dates.at(-1)!.date);
  const x = (date: string) =>
    last === first ? 330 : 60 + ((Date.parse(date) - first) / (last - first)) * 540;
  const plotValue = (d: BodyMetric, key: MetricKey) => {
    if (d[key] === undefined) return null;
    const baseline = dates.find((item) => item[key] !== undefined)?.[key];
    return relative ? (baseline === undefined ? null : changePercent(d[key]!, baseline)) : d[key]!;
  };
  const active = dates.find((d) => d.date === (hovered ?? pinned));
  const current = active ?? dates.at(-1)!;
  const summary = (metric: BodyMetric) => (
    <>
      {(Object.keys(metricOptions) as MetricKey[]).map((key) => (
        <Between key={key} style={{ gap: 10, fontSize: 12, marginTop: 9 }}>
          <span style={{ color: metricOptions[key].color }}>● {metricOptions[key].label}</span>
          <strong>
            {metric[key] === undefined ? '미측정' : `${metric[key]}${metricOptions[key].unit}`}
          </strong>
        </Between>
      ))}
    </>
  );
  const plot = (keys: MetricKey[], label: string) => {
    const values = keys.flatMap((key) =>
      dates.map((d) => plotValue(d, key)).filter((value): value is number => value !== null),
    );
    if (!values.length)
      return <Empty key={label}>{label} · 변화율을 계산할 기준값이 없어요.</Empty>;
    const { lower, upper } = chartBounds(values, relative);
    const y = (value: number) => 220 - ((value - lower) / (upper - lower)) * 180;
    return (
      <div
        key={label}
        style={{
          position: 'relative',
          minWidth: 0,
          border: !relative && selected.length > 1 ? `1px solid ${c.border}` : undefined,
          borderRadius: 14,
          padding: !relative && selected.length > 1 ? 10 : 0,
        }}
        onPointerLeave={() => setHovered(null)}
      >
        {!relative && (
          <strong
            style={{
              display: 'block',
              fontSize: 13,
              padding: '8px 12px',
              color: metricOptions[keys[0]].color,
            }}
          >
            {label} ({metricOptions[keys[0]].unit || '지수'})
          </strong>
        )}
        <svg
          viewBox="0 0 650 265"
          role="img"
          aria-label={`${label} 날짜별 그래프${relative ? ' · 첫 측정 대비 변화율' : ' · 실제 값'}`}
          style={{ width: '100%', display: 'block', touchAction: 'pan-y' }}
          onPointerMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const point = ((event.clientX - rect.left) / rect.width) * 650;
            const closest = dates.reduce(
              (best, d) =>
                Math.abs(x(d.date) - point) < Math.abs(x(best.date) - point) ? d : best,
              dates[0],
            );
            setHovered(closest.date);
          }}
          onClick={() => {
            if (hovered) setPinned(pinned === hovered ? null : hovered);
          }}
        >
          {Array.from({ length: 5 }, (_, i) => {
            const value = lower + ((upper - lower) * i) / 4;
            return (
              <g key={i}>
                <line
                  x1={60}
                  x2={600}
                  y1={y(value)}
                  y2={y(value)}
                  stroke={c.border}
                  strokeDasharray="4 4"
                />
                <text x={48} y={y(value) + 4} textAnchor="end" fontSize={11} fill={c.muted}>
                  {value.toFixed(1)}
                  {relative ? '%' : ''}
                </text>
              </g>
            );
          })}
          {relative && lower < 0 && upper > 0 && (
            <line x1={60} x2={600} y1={y(0)} y2={y(0)} stroke={c.muted} strokeDasharray="3 3" />
          )}
          {active && (
            <line
              x1={x(active.date)}
              x2={x(active.date)}
              y1={30}
              y2={225}
              stroke={c.muted}
              strokeDasharray="4 4"
            />
          )}
          {keys.map((key) => {
            let path = '';
            let connected = false;
            dates.forEach((d) => {
              const value = plotValue(d, key);
              if (value === null) {
                connected = false;
                return;
              }
              path += `${connected ? 'L' : 'M'}${x(d.date)},${y(value)} `;
              connected = true;
            });
            return (
              <g key={key}>
                <path d={path} fill="none" stroke={metricOptions[key].color} strokeWidth={2.5} />
                {dates.map((d) => {
                  const value = plotValue(d, key);
                  return value === null ? null : (
                    <circle
                      key={d.date}
                      cx={x(d.date)}
                      cy={y(value)}
                      r={active?.date === d.date ? 5 : 3}
                      fill={metricOptions[key].color}
                    >
                      <title>
                        {d.date} · {metricOptions[key].label} {d[key]}
                        {metricOptions[key].unit}
                      </title>
                    </circle>
                  );
                })}
              </g>
            );
          })}
          <text x={60} y={252} fill={c.muted} fontSize={11}>
            {dates[0].date}
          </text>
          <text x={600} y={252} textAnchor="end" fill={c.muted} fontSize={11}>
            {dates.at(-1)!.date}
          </text>
        </svg>
        {active && (
          <div
            role="tooltip"
            style={{
              position: 'absolute',
              zIndex: 3,
              top: relative ? 4 : 35,
              left: `clamp(0px, calc(${(x(active.date) / 650) * 100}% - 115px), calc(100% - 230px))`,
              width: 230,
              maxWidth: '100%',
              padding: 14,
              border: `1px solid ${c.border}`,
              borderRadius: 14,
              background: c.surface,
              boxShadow: '0 12px 32px #0008',
              pointerEvents: 'none',
            }}
          >
            <strong style={{ fontSize: 13 }}>{active.date}</strong>
            {summary(active)}
          </div>
        )}
      </div>
    );
  };
  return (
    <div>
      <Row style={{ marginBottom: 12 }}>
        <Button
          variant={relative ? 'soft' : 'ghost'}
          aria-pressed={relative}
          onClick={() => {
            setMode('relative');
            setHovered(null);
          }}
        >
          변화율 비교
        </Button>
        <Button
          variant={!relative ? 'soft' : 'ghost'}
          aria-pressed={!relative}
          onClick={() => {
            setMode('actual');
            setHovered(null);
          }}
        >
          {selected.length > 1 ? '지표별 실제 값' : '실제 값'}
        </Button>
      </Row>
      <Muted style={{ fontSize: 12 }}>
        {relative
          ? '각 지표의 첫 측정값을 0%로 맞춰 변화율을 비교해요. 툴팁에는 실제 측정값을 표시해요.'
          : '각 지표는 별도 축을 사용해요. 그래프 높이 대신 축의 숫자와 단위를 확인해주세요.'}
      </Muted>
      <div style={{ marginTop: 16 }}>
        {relative ? (
          plot(selected, '신체 변화율')
        ) : selected.length > 1 ? (
          <Grid>{selected.map((key) => plot([key], metricOptions[key].label))}</Grid>
        ) : (
          plot(selected, metricOptions[selected[0]].label)
        )}
      </div>
      <Row style={{ marginTop: 12 }}>
        {selected.map((key) => (
          <Muted key={key} style={{ fontSize: 12, color: metricOptions[key].color }}>
            ● {metricOptions[key].label}
          </Muted>
        ))}
      </Row>
      <Muted style={{ display: 'block', fontSize: 11, marginTop: 12 }}>
        그래프 위에 마우스를 올려보세요. 날짜를 누르거나 키보드로 선택해도 기록을 볼 수 있어요.
      </Muted>
      <Row style={{ margin: '12px 0', maxHeight: 90, overflowY: 'auto' }}>
        {dates.map((d) => (
          <Button
            key={d.date}
            variant={current.date === d.date ? 'soft' : 'ghost'}
            aria-pressed={pinned === d.date}
            onMouseEnter={() => setHovered(d.date)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(d.date)}
            onBlur={() => setHovered(null)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setHovered(null);
                setPinned(null);
              }
            }}
            onClick={() => setPinned(pinned === d.date ? null : d.date)}
            style={{ padding: '6px 9px', fontSize: 12 }}
          >
            {d.date.slice(5)}
          </Button>
        ))}
      </Row>
      <div aria-live="polite" style={{ padding: 16, borderRadius: 12, background: c.background }}>
        <strong>{current.date} 측정값</strong>
        <Grid style={{ gap: 4, marginTop: 4 }}>{summary(current)}</Grid>
      </div>
    </div>
  );
}
