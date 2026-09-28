import { colors as c } from '../../styles';
import { pulsePath, activityLabels } from '../../domain/activity';
export const activityColors = [
  c.activityIdle,
  c.activityPartial,
  c.activityComplete,
  c.activityExtra,
];
export function ActivityPulse({ level }: { level: 0 | 1 | 2 | 3 }) {
  return (
    <svg
      viewBox="0 0 100 64"
      preserveAspectRatio="none"
      role="img"
      aria-label={activityLabels[level]}
      style={{ display: 'block', width: '100%', height: 64 }}
    >
      <path
        d={pulsePath(level)}
        stroke={activityColors[level]}
        strokeWidth={2.5}
        fill="none"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
    </svg>
  );
}
