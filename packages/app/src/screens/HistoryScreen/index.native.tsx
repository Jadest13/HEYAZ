import { useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { Card, Text, Title, Muted, Button, ButtonText } from '../../components/common/ui.native';
import { ActivityPulse, activityColors } from '../../components/workout/ActivityPulse.native';
import { useApp } from '../../hooks/useApp';
import { dailyActivity, activityLabels } from '../../domain/activity';
import { planDates, movePlanDate } from '../../utils/planDates';
import { localDate } from '../../utils/date';
import { colors as c } from '../../styles';
export function HistoryScreen() {
  const { state } = useApp();
  const [month, setMonth] = useState(localDate());
  const [selected, setSelected] = useState(localDate());
  const [cards, setCards] = useState(false);
  const dates = planDates(month, 'month');
  const items = dates.map((date) => {
    const a = dailyActivity(state, date);
    return (
      <TouchableOpacity
        accessibilityLabel={`${date} ${a.label}`}
        key={date}
        onPress={() => setSelected(date)}
        style={{
          width: cards ? 160 : '14.2857%',
          borderWidth: 1,
          borderColor: selected === date ? c.accent : c.border,
          paddingVertical: 8,
          alignItems: 'center',
        }}
      >
        <Text>{Number(date.slice(8))}</Text>
        <ActivityPulse level={a.level} />
        <Muted>{a.burning ? '🔥' : ''}</Muted>
      </TouchableOpacity>
    );
  });
  return (
    <>
      <Card>
        <Title>{month.slice(0, 7)} 운동 기록</Title>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button onPress={() => setMonth(movePlanDate(month, 'month', -1))}>
            <ButtonText>이전 달</ButtonText>
          </Button>
          <Button onPress={() => setMonth(movePlanDate(month, 'month', 1))}>
            <ButtonText>다음 달</ButtonText>
          </Button>
        </View>
        <Button onPress={() => setCards((v) => !v)}>
          <ButtonText>{cards ? '달력 보기' : '카드 보기'}</ButtonText>
        </Button>
        {activityLabels.map((label, i) => (
          <Muted key={label} style={{ color: activityColors[i] }}>
            ● {label}
          </Muted>
        ))}
      </Card>
      {cards ? (
        <ScrollView horizontal>{items}</ScrollView>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {Array.from({ length: new Date(`${dates[0]}T12:00:00`).getDay() }, (_, i) => (
            <View key={`blank${i}`} style={{ width: '14.2857%' }} />
          ))}
          {items}
        </View>
      )}
      <Card>
        <Title>{selected}</Title>
        {dailyActivity(state, selected).sessions.map((s) => (
          <Text key={s.id}>
            {s.day.title} · {s.records.filter((r) => r.status === 'completed').length}세트 수행
          </Text>
        ))}
        <Muted>
          {dailyActivity(state, selected).label}
          {dailyActivity(state, selected).burning ? ' · 🔥 Burning Day 수행' : ''}
        </Muted>
      </Card>
    </>
  );
}
