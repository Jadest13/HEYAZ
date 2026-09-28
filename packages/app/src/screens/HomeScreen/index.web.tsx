import { exerciseSummary } from '../../domain/exerciseFields';
import { typography as t } from '@heyaz/app/styles/typography';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Clock,
  Dumbbell,
  Flame,
  MessageCircle,
  Play,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { useApp } from '../../hooks/useApp';
import {
  Button,
  Card,
  Between,
  Row,
  Grid,
  Stack,
  Title,
  Muted,
  Tag,
  Progress,
  Input,
} from '../../components/common/ui.web';
import { colors as c } from '../../styles';
import { exerciseById, weekdays } from '../../constants/exercises';
import { ExerciseInsight } from '../../components/exercise/ExerciseInsight.web';
import { localDate, uid, weekStart } from '../../utils/date';
import { calories } from '../../domain';
const Layout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.85fr) minmax(275px, 1fr);
  gap: 24px;
  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
`;
const Hero = styled(Card)`
  position: relative;
  overflow: hidden;
  padding: 30px;
  background: linear-gradient(115deg, ${c.navy}, ${c.heroEnd});
  color: ${c.onHero};
  border: 0;
  min-height: 200px;
  &:after {
    content: 'H';
    position: absolute;
    right: 25px;
    top: -58px;
    font-size: 310px;
    font-weight: 900;
    font-style: italic;
    line-height: 1;
    opacity: 0.04;
    pointer-events: none;
  }
`;
export function HomeScreen() {
  const { state, update } = useApp();
  const navigate = useNavigate();
  const today = localDate();
  const day = state.plan.days.find((d) => d.dayOfWeek === new Date().getDay());
  const next =
    day ??
    [...state.plan.days].sort(
      (a, b) =>
        ((a.dayOfWeek - new Date().getDay() + 7) % 7) -
        ((b.dayOfWeek - new Date().getDay() + 7) % 7),
    )[0];
  const completed = state.sessions.filter(
    (s) => s.status !== 'active' && s.date >= localDate(weekStart()),
  );
  const rate = Math.min(
    100,
    Math.round((new Set(completed.map((s) => s.date)).size / state.plan.days.length) * 100),
  );
  const [weight, setWeight] = useState(
    String(state.metrics.at(-1)?.weight ?? state.profile.weight),
  );
  const [saved, setSaved] = useState(false);
  const activeBurn = state.burning.find((b) => b.status === 'active');
  const kcal = calories(state.profile.weight, next.estimatedDuration);
  return (
    <Stack>
      <Between style={{ marginBottom: 6 }}>
        <div>
          <Row>
            <Tag tone="green">LET’S MOVE</Tag>
            <Muted>
              {new Date().toLocaleDateString('ko-KR', {
                month: 'long',
                day: 'numeric',
                weekday: 'long',
              })}
            </Muted>
          </Row>
          <h1 style={{ fontSize: t.heading, letterSpacing: -1.2, margin: '13px 0 8px' }}>
            {state.profile.name}님, 오늘도 나를 위한 한 걸음{' '}
            <span style={{ fontSize: t.heading }}>✦</span>
          </h1>
          <Muted>완벽한 하루보다, 꾸준한 움직임. 오늘의 운동을 시작해볼까요?</Muted>
        </div>
        <Button variant="ghost" onClick={() => navigate('/plan')}>
          <CalendarIcon />내 운동 계획
        </Button>
      </Between>
      <Layout>
        <Stack>
          <Hero>
            <Between>
              <Tag style={{ background: c.heroBadge, color: c.onHero }}>
                <Dumbbell size={12} />
                {day ? 'TODAY’S WORKOUT' : 'NEXT WORKOUT'}
              </Tag>
              <span style={{ opacity: 0.6, fontSize: t.caption }}>
                {weekdays[next.dayOfWeek]}요일 · {next.startTime}
              </span>
            </Between>
            <h2 style={{ fontSize: t.display, letterSpacing: -1, margin: '20px 0 12px' }}>
              {day ? next.title : '오늘은 회복하는 날'}
            </h2>
            <Row style={{ color: c.heroMuted, fontSize: t.small, gap: 18 }}>
              <span>
                <Clock size={13} /> {next.estimatedDuration}분
              </span>
              <span>
                <Dumbbell size={13} /> {next.exercises.length}개 운동
              </span>
              <span>
                <Flame size={13} /> 예상 {kcal.min}–{kcal.max} kcal
              </span>
            </Row>
            <Between style={{ marginTop: 25 }}>
              <span style={{ fontSize: t.caption, opacity: 0.55 }}>
                {day ? '작은 성취가 쌓여, 더 강한 내가 됩니다.' : `다음 운동: ${next.title}`}
              </span>
              <Button onClick={() => navigate('/workout')}>
                <Play size={14} fill="currentColor" />
                {state.activeSessionId ? '운동 이어하기' : day ? '운동 시작하기' : '다음 운동 시작'}
                <ArrowRight size={15} />
              </Button>
            </Between>
          </Hero>
          <Card>
            <Between>
              <Title>
                {day ? '오늘의 운동' : '다음 운동 미리보기'}{' '}
                <Muted style={{ marginLeft: 6 }}>{next.exercises.length}</Muted>
              </Title>
              <Button
                variant="ghost"
                style={{ padding: '6px 9px', fontSize: t.caption }}
                onClick={() => navigate('/plan/edit')}
              >
                계획 편집 <ChevronRight size={12} />
              </Button>
            </Between>
            <div style={{ marginTop: 16 }}>
              {next.exercises.map((e, i) => {
                const exercise = exerciseById(e.exerciseId);
                return (
                  <Between
                    key={e.id}
                    style={{
                      padding: '16px 0',
                      borderTop: i ? `1px solid ${c.border}` : undefined,
                    }}
                  >
                    <Row>
                      <span
                        style={{
                          width: 42,
                          height: 42,
                          display: 'grid',
                          placeItems: 'center',
                          borderRadius: 12,
                          background: i % 2 ? c.greenSoft : c.background,
                          color: i % 2 ? c.green : c.muted,
                        }}
                      >
                        <Dumbbell size={21} />
                      </span>
                      <div>
                        <strong style={{ fontSize: t.label }}>{exercise.name}</strong>
                        <div>
                          <Muted style={{ fontSize: t.caption }}>
                            {exercise.muscle} · {exercise.equipment}
                          </Muted>
                          <ExerciseInsight id={e.exerciseId} seconds={e.duration * e.sets} />
                        </div>
                      </div>
                    </Row>
                    <Row>
                      <span style={{ fontSize: t.small }}>{exerciseSummary(e)}</span>
                      <span
                        style={{
                          background: c.background,
                          borderRadius: 6,
                          padding: '6px 9px',
                          fontSize: t.caption,
                          minWidth: 48,
                          textAlign: 'center',
                        }}
                      >
                        {e.weight ? `${e.weight}kg` : '맨몸'}
                      </span>
                    </Row>
                  </Between>
                );
              })}
            </div>
          </Card>
          <Card>
            <Between>
              <Title>이번 주의 움직임</Title>
              <Muted>
                {completed.length}회 기록 · 목표 {state.plan.days.length}회
              </Muted>
            </Between>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7,1fr)',
                gap: 8,
                margin: '24px 0',
              }}
            >
              {[1, 2, 3, 4, 5, 6, 0].map((d, i) => {
                const date = new Date(weekStart());
                date.setDate(date.getDate() + i);
                const done = completed.some((s) => s.date === localDate(date));
                const planned = state.plan.days.some((p) => p.dayOfWeek === d);
                return (
                  <div key={d} style={{ textAlign: 'center' }}>
                    <Muted style={{ fontSize: t.caption }}>{weekdays[d]}</Muted>
                    <div
                      style={{
                        margin: '10px auto 7px',
                        height: 38,
                        width: 38,
                        borderRadius: 12,
                        display: 'grid',
                        placeItems: 'center',
                        background: done
                          ? c.green
                          : d === new Date().getDay()
                            ? c.accent
                            : planned
                              ? c.accentSoft
                              : c.background,
                        color:
                          done || d === new Date().getDay()
                            ? c.onAccent
                            : planned
                              ? c.accent
                              : c.muted,
                      }}
                    >
                      {done ? (
                        <Check size={18} />
                      ) : planned ? (
                        <Dumbbell size={16} />
                      ) : (
                        <span>—</span>
                      )}
                    </div>
                    <Muted style={{ fontSize: t.caption }}>{date.getDate()}일</Muted>
                  </div>
                );
              })}
            </div>
            <Between style={{ marginBottom: 10 }}>
              <Muted>주간 목표 달성률</Muted>
              <strong style={{ color: c.accent }}>{rate}%</strong>
            </Between>
            <Progress value={rate} />
          </Card>
        </Stack>
        <Stack>
          <Card style={{ background: c.accentSoft, borderColor: c.accentBorder }}>
            <Between>
              <Row>
                <Flame size={20} color={c.accent} />
                <Title>Burning Day</Title>
              </Row>
              <Tag>{activeBurn ? '진행 중' : '틈새 운동'}</Tag>
            </Between>
            <p style={{ fontSize: t.label, lineHeight: 1.8, margin: '16px 0' }}>
              앉아 있는 하루에, 움직임 한 스푼.
              <br />
              <Muted>짧은 운동으로 하루를 채워보세요.</Muted>
            </p>
            {activeBurn && (
              <Progress
                value={
                  (activeBurn.events.filter((e) => e.status !== 'pending').length /
                    activeBurn.events.length) *
                  100
                }
              />
            )}
            <Button
              variant="ghost"
              style={{ width: '100%', marginTop: 12, border: 0, color: c.accent }}
              onClick={() => navigate(activeBurn ? '/burning-day' : '/burning-day/setup')}
            >
              {activeBurn ? '진행 상태 보기' : 'Burning Day 시작'}
              <ArrowUpRight size={14} />
            </Button>
          </Card>
          <Card>
            <Between>
              <Row>
                <span
                  style={{
                    background: c.accentSoft,
                    padding: 9,
                    borderRadius: 12,
                    color: c.accent,
                  }}
                >
                  <Sparkles size={18} />
                </span>
                <Title>나의 AI 코치</Title>
              </Row>
              <Tag>DEMO</Tag>
            </Between>
            <p style={{ fontSize: t.body, lineHeight: 1.9, margin: '18px 0 10px' }}>
              {completed.length
                ? '좋은 흐름을 이어가고 있어요. 오늘 컨디션에 맞게 운동을 조정해보세요.'
                : '첫 운동을 기록해보세요. 나에게 맞는 루틴을 함께 찾아가요.'}
            </p>
            <Muted style={{ fontSize: t.caption }}>시간이 부족하다면 코치에게 알려주세요.</Muted>
            <Button
              variant="ghost"
              style={{ marginTop: 18, width: '100%' }}
              onClick={() => navigate('/ai-coach')}
            >
              <MessageCircle size={15} />
              코치와 대화하기
              <ArrowRight size={14} />
            </Button>
          </Card>
          <Card>
            <Between>
              <Title>오늘의 바디 체크</Title>
              <HeartIcon />
            </Between>
            <Muted style={{ display: 'block', margin: '12px 0 17px' }}>
              매일의 작은 변화도 소중하니까요.
            </Muted>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const w = Number(weight);
                if (w < 20 || w > 400) return;
                update((s) => ({
                  ...s,
                  metrics: [
                    ...s.metrics.filter((m) => m.date !== today),
                    {
                      id: uid(),
                      date: today,
                      weight: w,
                      height: s.profile.height,
                      bmi: Number((w / (s.profile.height / 100) ** 2).toFixed(1)),
                    },
                  ],
                }));
                setSaved(true);
              }}
            >
              <Row>
                <Input
                  aria-label="오늘 체중"
                  type="number"
                  min="20"
                  max="400"
                  step=".1"
                  required
                  value={weight}
                  onChange={(e) => {
                    setWeight(e.target.value);
                    setSaved(false);
                  }}
                  style={{ width: 100, fontSize: t.metric, fontWeight: 750, border: 0, padding: 0 }}
                />
                <Muted>kg</Muted>
                <Button
                  variant="soft"
                  type="submit"
                  style={{ marginLeft: 'auto', padding: '8px 13px' }}
                >
                  {saved ? '저장 완료' : '기록하기'}
                </Button>
              </Row>
            </form>
            <div style={{ borderTop: `1px solid ${c.border}`, marginTop: 20, paddingTop: 13 }}>
              <Muted style={{ fontSize: t.caption }}>
                목표 체중 {state.profile.targetWeight}kg
              </Muted>
              <button
                onClick={() => navigate('/body')}
                style={{
                  float: 'right',
                  border: 0,
                  background: 'none',
                  cursor: 'pointer',
                  color: c.muted,
                }}
                aria-label="신체 변화 보기"
              >
                <TrendingUp size={16} />
              </button>
            </div>
          </Card>
          <Grid columns={2}>
            <Card style={{ padding: 18 }}>
              <Target size={18} color={c.accent} />
              <div style={{ fontSize: t.metric, fontWeight: 800, margin: '12px 0 4px' }}>
                {completed.length}
                <Muted> 회</Muted>
              </div>
              <Muted style={{ fontSize: t.caption }}>이번 주 운동</Muted>
            </Card>
            <Card style={{ padding: 18 }}>
              <Flame size={18} color={c.green} />
              <div style={{ fontSize: t.metric, fontWeight: 800, margin: '12px 0 4px' }}>
                {state.sessions.filter((s) => s.status !== 'active').length}
                <Muted> 회</Muted>
              </div>
              <Muted style={{ fontSize: t.caption }}>누적 운동</Muted>
            </Card>
          </Grid>
        </Stack>
      </Layout>
    </Stack>
  );
}
function CalendarIcon() {
  return <Clock size={15} />;
}
function HeartIcon() {
  return <TrendingUp size={17} color={c.muted} />;
}
