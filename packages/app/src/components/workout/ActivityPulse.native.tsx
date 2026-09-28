import { useState } from 'react';
import { View } from 'react-native';
import { colors as c } from '../../styles';
import { activityLabels } from '../../domain/activity';
export const activityColors = [
  c.activityIdle,
  c.activityPartial,
  c.activityComplete,
  c.activityExtra,
];
export function ActivityPulse({ level }: { level: 0 | 1 | 2 | 3 }) {
  const [width, setWidth] = useState(100);
  const a = [0, 7, 16, 27][level];
  const points = [
    [0, 32],
    [28, 32],
    [36, 32 - a * 0.3],
    [42, 32 + a * 0.3],
    [50, 32 - a],
    [58, 32 + a * 0.65],
    [65, 32],
    [100, 32],
  ];
  return (
    <View
      accessible
      accessibilityLabel={activityLabels[level]}
      style={{ height: 64, width: '100%' }}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      {points.slice(1).map((point, i) => {
        const prev = points[i];
        const dx = ((point[0] - prev[0]) * width) / 100;
        const dy = point[1] - prev[1];
        const length = Math.sqrt(dx * dx + dy * dy);
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              width: length,
              height: 2,
              backgroundColor: activityColors[level],
              left: (((prev[0] + point[0]) / 2) * width) / 100 - length / 2,
              top: (prev[1] + point[1]) / 2 - 1,
              transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }],
            }}
          />
        );
      })}
    </View>
  );
}
