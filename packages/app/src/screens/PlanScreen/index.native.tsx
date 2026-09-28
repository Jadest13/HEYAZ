import { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, TouchableOpacity, View } from 'react-native';
import { useApp } from '../../hooks/useApp';
import { Card, Title, Text, Muted, Button, ButtonText } from '../../components/common/ui.native';
import { ExerciseFields } from '../../components/exercise/ExerciseFields';
import { planDates, movePlanDate } from '../../utils/planDates';
import { localDate } from '../../utils/date';
import { weekdays, exerciseById } from '../../constants/exercises';
import { exerciseSummary } from '../../domain/exerciseFields';
import { applyPlan } from '../../domain';
import { clone } from '../../utils/clone';
import { colors as c } from '../../styles';
export function PlanScreen({ onWorkout }: { onWorkout: (dayId: string) => void }) {
  const { state, update } = useApp();
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [cards, setCards] = useState(true);
  const [selected, setSelected] = useState(localDate());
  const [width, setWidth] = useState(320);
  const [draft, setDraft] = useState<typeof state.plan | null>(null);
  const scroll = useRef<ScrollView>(null);
  const dates = planDates(selected, period);
  const index = dates.indexOf(selected);
  const cardWidth = cards ? Math.min(330, width * 0.88) : 78;
  const full = !cards && period === 'week';
  useEffect(() => {
    scroll.current?.scrollTo({ x: full ? 0 : index * (cardWidth + 12), animated: true });
  }, [selected, cards, period, width, index, cardWidth, full]);
  const dayFor = (date: string) =>
    (draft ?? state.plan).days.find((d) => d.dayOfWeek === new Date(`${date}T12:00:00`).getDay());
  const details = (date: string) => {
    const day = dayFor(date);
    return (
      <>
        <Title>{day?.title ?? '회복하는 날'}</Title>
        {day ? (
          <>
            <Muted>
              {day.startTime} · {day.estimatedDuration}분
            </Muted>
            {day.exercises.map((e) => (
              <View key={e.id} style={{ marginVertical: 10 }}>
                <Text>{exerciseById(e.exerciseId).name}</Text>
                {draft ? (
                  <ExerciseFields
                    value={e}
                    onChange={(next) =>
                      setDraft((p) =>
                        p
                          ? {
                              ...p,
                              days: p.days.map((d) =>
                                d.id === day.id
                                  ? {
                                      ...d,
                                      exercises: d.exercises.map((item) =>
                                        item.id === e.id ? next : item,
                                      ),
                                    }
                                  : d,
                              ),
                            }
                          : p,
                      )
                    }
                  />
                ) : (
                  <Muted>{exerciseSummary(e)}</Muted>
                )}
              </View>
            ))}
            {!draft && (
              <Button onPress={() => onWorkout(day.id)}>
                <ButtonText>이 루틴으로 운동 시작</ButtonText>
              </Button>
            )}
          </>
        ) : (
          <Muted>충분히 쉬면서 회복해보세요.</Muted>
        )}
      </>
    );
  };
  return (
    <>
      <Card>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button onPress={() => setPeriod((p) => (p === 'week' ? 'month' : 'week'))}>
            <ButtonText>{period === 'week' ? '주간' : '월간'} · 전환</ButtonText>
          </Button>
          <Button onPress={() => setCards((v) => !v)}>
            <ButtonText>{cards ? '카드 보기' : '탭 보기'} · 전환</ButtonText>
          </Button>
        </View>
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Button onPress={() => setSelected(movePlanDate(selected, period, -1))}>
            <ButtonText>←</ButtonText>
          </Button>
          <Text>{selected.slice(0, 7)}</Text>
          <Button onPress={() => setSelected(movePlanDate(selected, period, 1))}>
            <ButtonText>→</ButtonText>
          </Button>
        </View>
        <Button onPress={() => setSelected(localDate())}>
          <ButtonText>오늘로</ButtonText>
        </Button>
        <Button onPress={() => setDraft(draft ? null : clone(state.plan))}>
          <ButtonText>{draft ? '편집 취소' : '운동 수치 편집'}</ButtonText>
        </Button>
        {draft && (
          <Button
            onPress={() => {
              try {
                const next = applyPlan(state, draft, draft.revision);
                update(() => next);
                setDraft(null);
              } catch (e) {
                Alert.alert('저장 실패', (e as Error).message);
              }
            }}
          >
            <ButtonText>계획 저장</ButtonText>
          </Button>
        )}
      </Card>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        <ScrollView
          horizontal
          ref={scroll}
          contentContainerStyle={{
            gap: full ? 4 : 12,
            paddingHorizontal: full ? 0 : Math.max(0, (width - cardWidth) / 2),
            ...(full ? { width: '100%' } : {}),
          }}
        >
          {dates.map((date) => (
            <TouchableOpacity
              key={date}
              accessibilityRole={cards ? 'button' : 'tab'}
              accessibilityState={{ selected: date === selected }}
              onPress={() => setSelected(date)}
              style={{
                ...(full ? { flex: 1 } : { width: cardWidth }),
                padding: cards ? 16 : 6,
                borderRadius: 12,
                borderWidth: 2,
                borderColor:
                  date === selected ? c.accent : date === localDate() ? c.green : c.border,
                backgroundColor: c.surface,
              }}
            >
              <Text>
                {Number(date.slice(8))} {weekdays[new Date(`${date}T12:00:00`).getDay()]}
              </Text>
              {date === localDate() && <Muted style={{ color: c.green }}>오늘</Muted>}
              {cards && details(date)}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      {!cards && <Card style={{ marginTop: 16 }}>{details(selected)}</Card>}
    </>
  );
}
