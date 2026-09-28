import { PlanScreen } from '../screens/PlanScreen/index.native';
import { HistoryScreen } from '../screens/HistoryScreen/index.native';
import { SetEntry } from '../components/workout/SetEntry.native';
import { SettingsScreen } from '../screens/SettingsScreen/index.native';
import { AssessmentScreen } from '../screens/AssessmentScreen/index.native';
import { DesignSystem } from '../screens/DesignSystem/index.native';
import { useCoach } from '../hooks/useCoach';
import { typography as typeScale } from '@heyaz/app/styles/typography';
import { clone } from '@heyaz/app/utils/clone';
import { useState } from 'react';
import { Alert, ScrollView, View, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import styled from '@emotion/native';
import { useApp } from '@heyaz/app/hooks/useApp';
import { colors as c } from '@heyaz/app/styles/index';
import { exerciseById } from '@heyaz/app/constants/exercises';
import { localDate, uid } from '@heyaz/app/utils/date';
import { applyPlan } from '@heyaz/app/domain/index';
const Box = styled.View({
  backgroundColor: c.surface,
  borderRadius: 18,
  padding: 20,
  marginBottom: 16,
  borderWidth: 1,
  borderColor: c.border,
});
const Text = styled.Text({ color: c.text, fontSize: typeScale.body, lineHeight: 27 });
const Heading = styled.Text({
  color: c.text,
  fontSize: typeScale.metric,
  fontWeight: '800',
  marginBottom: 18,
});
const Small = styled.Text({ color: c.muted, fontSize: typeScale.small, lineHeight: 23 });
const Press = styled.TouchableOpacity({
  backgroundColor: c.accent,
  padding: 14,
  borderRadius: 10,
  marginTop: 12,
  alignItems: 'center',
});
const PressText = styled.Text({ color: c.onAccent, fontWeight: '700' });
const Input = styled.TextInput({
  borderWidth: 1,
  borderColor: c.border,
  borderRadius: 9,
  padding: 12,
  marginTop: 10,
  color: c.text,
});

export default function NativeApp() {
  const { state, update, error } = useApp();
  const [tab, setTab] = useState('홈');
  const [message, setMessage] = useState('');
  const [weight, setWeight] = useState(String(state.profile.weight));
  const coach = useCoach();
  const { busy } = coach;
  const active = state.sessions.find((s) => s.id === state.activeSessionId);
  const day =
    state.plan.days.find((d) => d.dayOfWeek === new Date().getDay()) ?? state.plan.days[0];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <StatusBar barStyle="light-content" backgroundColor={c.background} />
      <View
        style={{
          padding: 20,
          borderBottomWidth: 1,
          borderColor: c.border,
          backgroundColor: c.surface,
        }}
      >
        <Heading style={{ marginBottom: 0 }}>
          HEYAZ<Text style={{ color: c.accent }}>.</Text>
        </Heading>
        <Small>EVERY MOVE COUNTS · 로컬 저장</Small>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {tab === '설정' && <SettingsScreen onDesignSystem={() => setTab('디자인 시스템')} />}
        {tab === '디자인 시스템' && <DesignSystem />}
        {tab === '체력 확인' && <AssessmentScreen onCoach={() => setTab('AI 코치')} />}
        {error && <Text>{error}</Text>}
        <Heading>{tab === '홈' ? `${state.profile.name}님, 함께 움직여요` : tab}</Heading>
        {tab === '홈' && (
          <Press onPress={() => setTab('체력 확인')}>
            <PressText>체력 확인으로 시작하기</PressText>
          </Press>
        )}
        {tab === '마이' && (
          <Press onPress={() => setTab('설정')}>
            <PressText>설정</PressText>
          </Press>
        )}
        {tab === '홈' && (
          <>
            <Box>
              <Small>오늘의 루틴</Small>
              <Heading style={{ marginTop: 10 }}>{day.title}</Heading>
              <Small>
                {day.estimatedDuration}분 · {day.exercises.length}개 운동
              </Small>
              {day.exercises.map((e) => (
                <Text key={e.id}>
                  {exerciseById(e.exerciseId).name} · {e.sets}세트
                </Text>
              ))}
              <Press
                onPress={() => {
                  if (!active) {
                    const id = uid();
                    update((s) => ({
                      ...s,
                      activeSessionId: id,
                      sessions: [
                        ...s.sessions,
                        {
                          id,
                          date: localDate(),
                          startedAt: new Date().toISOString(),
                          planRevision: s.plan.revision,
                          day: clone(day),
                          records: [],
                          status: 'active',
                        },
                      ],
                    }));
                  }
                  setTab('운동');
                }}
              >
                <PressText>{active ? '운동 이어하기' : '운동 시작'}</PressText>
              </Press>
            </Box>
            <Box>
              <Text>나의 AI 코치</Text>
              <Small>시간이 부족하면 오늘의 계획을 조정해보세요.</Small>
              <Press onPress={() => setTab('AI 코치')}>
                <PressText>코치와 대화하기</PressText>
              </Press>
            </Box>
          </>
        )}
        {tab === '계획' && (
          <PlanScreen
            onWorkout={(dayId) => {
              if (!state.activeSessionId) {
                const selectedDay = state.plan.days.find((d) => d.id === dayId);
                if (!selectedDay) return;
                const id = uid();
                update((s) => ({
                  ...s,
                  activeSessionId: id,
                  sessions: [
                    ...s.sessions,
                    {
                      id,
                      date: localDate(),
                      startedAt: new Date().toISOString(),
                      planRevision: s.plan.revision,
                      day: clone(selectedDay),
                      records: [],
                      status: 'active',
                    },
                  ],
                }));
              }
              setTab('운동');
            }}
          />
        )}
        {tab === '운동' && active && (
          <>
            <Box>
              <Heading>{active.day.title}</Heading>
              {active.day.exercises.map((e) => (
                <SetEntry
                  key={e.id}
                  planned={e}
                  count={active.records.filter((r) => r.id.startsWith(e.id + ':')).length}
                  onComplete={(actual) =>
                    update((s) => ({
                      ...s,
                      sessions: s.sessions.map((w) =>
                        w.id === active.id
                          ? {
                              ...w,
                              records: [
                                ...w.records,
                                {
                                  id:
                                    e.id +
                                    ':' +
                                    (w.records.filter((r) => r.id.startsWith(e.id + ':')).length +
                                      1),
                                  exerciseId: e.exerciseId,
                                  set:
                                    w.records.filter((r) => r.id.startsWith(e.id + ':')).length + 1,
                                  reps: actual.reps,
                                  weight: actual.weight,
                                  duration:
                                    exerciseById(e.exerciseId).kind === 'timed'
                                      ? actual.duration
                                      : 0,
                                  status: 'completed',
                                  completedAt: new Date().toISOString(),
                                },
                              ],
                            }
                          : w,
                      ),
                    }))
                  }
                />
              ))}
              <Press
                onPress={() => {
                  update((s) => ({
                    ...s,
                    activeSessionId: undefined,
                    sessions: s.sessions.map((w) =>
                      w.id === active.id
                        ? {
                            ...w,
                            endedAt: new Date().toISOString(),
                            status:
                              w.records.length === w.day.exercises.reduce((n, e) => n + e.sets, 0)
                                ? 'completed'
                                : 'partial',
                          }
                        : w,
                    ),
                  }));
                  setTab('기록');
                }}
              >
                <PressText>종료하고 기록 저장</PressText>
              </Press>
            </Box>
          </>
        )}
        {tab === 'AI 코치' && (
          <>
            <Small>
              남은 이용 {coach.allowance.remaining}/{coach.allowance.limit}회{' '}
              {coach.allowance.freeCorrection ? '· 무료 수정 가능' : ''}
            </Small>
            <Small>{coach.error}</Small>
            {state.messages.map((m) => (
              <View
                key={m.id}
                style={{
                  flexDirection: 'row',
                  gap: 10,
                  justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                {m.role === 'assistant' && (
                  <View
                    accessibilityLabel="AI 코치"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: c.accentSoft,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: 4,
                    }}
                  >
                    <Text>✦</Text>
                  </View>
                )}
                <Box
                  style={{
                    flexShrink: 1,
                    maxWidth: m.role === 'user' ? '85%' : undefined,
                    backgroundColor: m.role === 'user' ? c.accentSoft : c.surface,
                  }}
                >
                  <Text>{m.text}</Text>
                  {m.components.map((component, i) =>
                    component.type === 'PLAN_CHANGE' ? (
                      <View key={i}>
                        <Text>{component.proposal.reason}</Text>
                        <Small>
                          {component.proposal.before.name} → {component.proposal.after.name}
                        </Small>
                        {component.proposal.status === 'pending' && (
                          <>
                            <Press
                              onPress={() => {
                                try {
                                  const next = applyPlan(
                                    state,
                                    component.proposal.after,
                                    component.proposal.baseRevision,
                                  );
                                  update(() => {
                                    return {
                                      ...next,
                                      messages: next.messages.map((msg) => ({
                                        ...msg,
                                        components: msg.components.map((item) =>
                                          item.type === 'PLAN_CHANGE' &&
                                          item.proposal.id === component.proposal.id
                                            ? {
                                                ...item,
                                                proposal: { ...item.proposal, status: 'applied' },
                                              }
                                            : item,
                                        ),
                                      })),
                                    };
                                  });
                                } catch (e) {
                                  Alert.alert('적용 실패', (e as Error).message);
                                }
                              }}
                            >
                              <PressText>변경 적용</PressText>
                            </Press>
                            <Press
                              style={{ backgroundColor: c.surface }}
                              onPress={() =>
                                update((s) => ({
                                  ...s,
                                  messages: s.messages.map((msg) => ({
                                    ...msg,
                                    components: msg.components.map((item) =>
                                      item.type === 'PLAN_CHANGE' &&
                                      item.proposal.id === component.proposal.id
                                        ? {
                                            ...item,
                                            proposal: { ...item.proposal, status: 'rejected' },
                                          }
                                        : item,
                                    ),
                                  })),
                                }))
                              }
                            >
                              <Text>기존 계획 유지</Text>
                            </Press>
                          </>
                        )}
                        {component.proposal.status !== 'pending' && (
                          <Small>
                            {component.proposal.status === 'applied'
                              ? '적용된 계획입니다.'
                              : '기존 계획을 유지했습니다.'}
                          </Small>
                        )}
                      </View>
                    ) : null,
                  )}
                </Box>
              </View>
            ))}
            <Input
              placeholderTextColor={c.muted}
              keyboardAppearance="dark"
              accessibilityLabel="코치 메시지"
              value={message}
              onChangeText={setMessage}
              placeholder="30분으로 줄여줘"
            />
            <Press
              disabled={busy}
              onPress={async () => {
                if (!message.trim()) return;
                if (await coach.send(message)) setMessage('');
              }}
            >
              <PressText>{busy ? '준비 중' : '보내기'}</PressText>
            </Press>
          </>
        )}
        {tab === '기록' && <HistoryScreen />}
        {tab === '마이' && (
          <Box>
            <Text>{state.profile.name}님의 신체 기록</Text>
            <Input
              placeholderTextColor={c.muted}
              keyboardAppearance="dark"
              accessibilityLabel="체중"
              keyboardType="decimal-pad"
              value={weight}
              onChangeText={setWeight}
            />
            <Press
              onPress={() => {
                const w = Number(weight);
                if (w < 20 || w > 400 || !Number.isFinite(w)) {
                  Alert.alert('체중 확인', '20~400kg 사이로 입력해주세요.');
                  return;
                }
                update((s) => ({
                  ...s,
                  metrics: [
                    ...s.metrics.filter((m) => m.date !== localDate()),
                    {
                      id: uid(),
                      date: localDate(),
                      weight: w,
                      height: s.profile.height,
                      bmi: Number((w / (s.profile.height / 100) ** 2).toFixed(1)),
                    },
                  ],
                }));
                Alert.alert('저장 완료', '오늘의 체중을 기록했습니다.');
              }}
            >
              <PressText>체중 기록</PressText>
            </Press>
            {state.metrics.map((m) => (
              <Text key={m.id}>
                {m.date} · {m.weight}kg · BMI {m.bmi}
              </Text>
            ))}
          </Box>
        )}
        <Small style={{ marginTop: 20 }}>
          Native 초기 구현 · 전체 계획 편집, 분석, Burning Day는 웹에서 제공됩니다.
        </Small>
      </ScrollView>
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: c.surface,
          borderTopWidth: 1,
          borderColor: c.border,
        }}
      >
        {['홈', '계획', 'AI 코치', '기록', '마이'].map((t) => (
          <View key={t} style={{ flex: 1 }}>
            <Press
              style={{
                backgroundColor: tab === t ? c.accentSoft : c.surface,
                borderRadius: 0,
                marginTop: 0,
                padding: 14,
              }}
              onPress={() => setTab(t)}
            >
              <Text style={{ fontSize: typeScale.small, color: tab === t ? c.accent : c.muted }}>
                {t}
              </Text>
            </Press>
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}
