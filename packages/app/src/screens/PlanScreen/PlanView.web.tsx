import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import {
  CalendarDays,
  Clock3,
  Dumbbell,
  HeartPulse,
  Sparkles,
  Pencil,
  Play,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Leaf,
  Focus,
} from 'lucide-react';
import {
  Button,
  Card,
  Between,
  Row,
  Stack,
  Title,
  Muted,
  Tag,
} from '../../components/common/ui.web';
import { colors as c } from '../../styles';
import { useApp } from '../../hooks/useApp';
import { exerciseById, weekdays } from '../../constants/exercises';
import { exerciseSummary } from '../../domain/exerciseFields';
import { ExerciseDetailModal } from '../../components/exercise/ExerciseDetailModal.web';
import { localDate } from '../../utils/date';
import { planDates, movePlanDate } from '../../utils/planDates';
import type { PlannedExercise, WorkoutDay } from '../../types';
const Summary = styled(Card)`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
  padding: 20px;
  background: linear-gradient(120deg, ${c.surface}, #1b2629);
  > div {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  strong {
    display: block;
    font-size: 24px;
    margin-bottom: 6px;
  }
  svg {
    color: ${c.accent};
    flex-shrink: 0;
  }
  @media (max-width: 760px) {
    gap: 12px;
    padding: 18px 12px;
    > div {
      flex-direction: column;
      align-items: flex-start;
      gap: 10px;
    }
    strong {
      font-size: 18px;
    }
    small {
      font-size: 11px;
    }
  }
`;
const Rail = styled.div`
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 8px;
  scroll-behavior: smooth;
  > button {
    flex: 1;
    min-width: 0;
  }
`;
const DayTab = styled.button<{ selected: boolean; today: boolean }>`
  border: 1px solid ${(p) => (p.selected ? c.accent : p.today ? c.green : c.border)};
  background: ${(p) => (p.selected ? c.accent : c.surface)};
  color: ${(p) => (p.selected ? c.onAccent : c.text)};
  border-radius: 12px;
  padding: 10px 4px;
  cursor: pointer;
  font: inherit;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  strong {
    font-size: 23px;
  }
  small {
    font-size: 11px;
  }
`;
const Workspace = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.65fr) minmax(260px, 1fr);
  gap: 20px;
  align-items: start;
  @media (max-width: 1050px) {
    grid-template-columns: 1fr;
  }
`;
const ExerciseRow = styled.button`
  display: flex;
  width: 100%;
  gap: 16px;
  align-items: center;
  text-align: left;
  padding: 14px 0;
  background: transparent;
  border: 0;
  border-bottom: 1px solid ${c.border};
  color: ${c.text};
  font: inherit;
  cursor: pointer;
  &:hover {
    background: ${c.accentSoft};
  }
  > svg:last-child {
    flex-shrink: 0;
    color: ${c.muted};
  }
  .number {
    color: ${c.accent};
    font-size: 13px;
    font-variant-numeric: tabular-nums;
  }
  .icon {
    background: ${c.background};
    padding: 12px;
    border-radius: 12px;
    display: grid;
    place-items: center;
    color: ${c.muted};
  }
  .name {
    flex: 1;
    min-width: 0;
  }
  .dose {
    font-size: 13px;
    text-align: right;
    max-width: 180px;
  }
  @media (max-width: 760px) {
    gap: 9px;
    .icon {
      display: none;
    }
    .dose {
      max-width: 100px;
      font-size: 12px;
    }
    .number {
      font-size: 11px;
    }
  }
`;
function Routine({
  day,
  onExercise,
}: {
  day?: WorkoutDay;
  onExercise: (exercise: PlannedExercise) => void;
}) {
  const navigate = useNavigate();
  if (!day)
    return (
      <Card>
        <Leaf size={32} color={c.green} />
        <h2 style={{ marginTop: 20 }}>회복하는 날</h2>
        <Muted>가벼운 움직임과 충분한 휴식으로 다음 운동을 준비해요.</Muted>
      </Card>
    );
  return (
    <Card>
      <Between>
        <div>
          <Tag>YOUR ROUTINE</Tag>
          <h2 style={{ margin: '14px 0 8px' }}>{day.title}</h2>
        </div>
        <Row>
          <Clock3 size={15} />
          <Muted>
            {day.startTime} · {day.estimatedDuration}분
          </Muted>
        </Row>
      </Between>
      <div style={{ marginTop: 12 }}>
        {day.exercises.map((e, index) => {
          const info = exerciseById(e.exerciseId);
          const Icon = info.cardio ? HeartPulse : Dumbbell;
          return (
            <ExerciseRow
              key={e.id}
              onClick={() => onExercise(e)}
              aria-label={`${info.name} 상세 보기`}
            >
              <span className="number">{String(index + 1).padStart(2, '0')}</span>
              <span className="icon">
                <Icon size={25} />
              </span>
              <div className="name">
                <strong>{info.name}</strong>
                <div style={{ marginTop: 6 }}>
                  <Muted style={{ fontSize: 12 }}>
                    {info.cardio ? '유산소 · ' : ''}
                    {(info.targets ?? [info.muscle]).slice(0, 2).join(' · ')}
                  </Muted>
                </div>
              </div>
              <span className="dose">{exerciseSummary(e).replace(/ · \d+초 휴식$/, '')}</span>
              <ChevronRight size={17} />
            </ExerciseRow>
          );
        })}
      </div>
      <Button
        style={{ width: '100%', marginTop: 24, padding: 15 }}
        onClick={() => navigate(`/workout?day=${day.id}`)}
      >
        <Play size={18} fill="currentColor" />
        운동 시작
      </Button>
    </Card>
  );
}
export function PlanScreen() {
  const { state } = useApp();
  const navigate = useNavigate();
  const today = localDate();
  const [selected, setSelected] = useState(today);
  const [detail, setDetail] = useState<PlannedExercise | null>(null);
  const rail = useRef<HTMLDivElement>(null);
  const dates = planDates(selected, 'week');
  const dayFor = (date: string) =>
    state.plan.days.find((d) => d.dayOfWeek === new Date(`${date}T12:00:00`).getDay());
  const day = dayFor(selected);
  const muscleSets = new Map<string, number>();
  state.plan.days.forEach((d) =>
    d.exercises.forEach((e) => {
      const muscle = exerciseById(e.exerciseId).muscle;
      muscleSets.set(muscle, (muscleSets.get(muscle) ?? 0) + e.sets);
    }),
  );
  const maxSets = Math.max(1, ...muscleSets.values());
  const upcoming = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(`${selected}T12:00:00`);
    date.setDate(date.getDate() + i + 1);
    return localDate(date);
  })
    .filter((date) => dayFor(date))
    .slice(0, 2);
  useEffect(() => {
    const container = rail.current;
    const element = container?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (container && element)
      container.scrollTo({
        left:
          element.offsetLeft -
          container.offsetLeft -
          (container.clientWidth - element.clientWidth) / 2,
        behavior: 'smooth',
      });
  }, [selected]);
  return (
    <Stack style={{ gap: 16 }}>
      <Between>
        <div>
          <h1>나의 운동 계획</h1>
          <Muted>내 생활에 맞는 리듬으로 꾸준하게.</Muted>
        </div>
        <Row>
          <Button variant="ghost" onClick={() => navigate('/plan/edit')}>
            <Pencil size={16} />
            계획 편집
          </Button>
          <Button onClick={() => navigate('/ai-coach?prompt=계획 만들기')}>
            <Sparkles size={17} />
            AI 계획 만들기
          </Button>
        </Row>
      </Between>
      <Summary>
        <div>
          <Dumbbell size={30} />
          <div>
            <strong>주 {state.plan.days.length}회</strong>
            <Muted as="small">꾸준한 운동 빈도</Muted>
          </div>
        </div>
        <div>
          <Clock3 size={30} />
          <div>
            <strong>{state.plan.days.reduce((sum, d) => sum + d.estimatedDuration, 0)}분</strong>
            <Muted as="small">주간 총 운동 시간</Muted>
          </div>
        </div>
        <div>
          <HeartPulse size={30} />
          <div>
            <strong>{muscleSets.size}개 부위</strong>
            <Muted as="small">이번 주 자극 분포</Muted>
          </div>
        </div>
      </Summary>
      <Between>
        <strong>
          {`${dates[0].slice(0, 4)}년 ${Number(dates[0].slice(5, 7))}월 ${Number(dates[0].slice(8))}일 – ${dates.at(-1)!.slice(0, 4) !== dates[0].slice(0, 4) ? `${dates.at(-1)!.slice(0, 4)}년 ` : ''}${Number(dates.at(-1)!.slice(5, 7))}월 ${Number(dates.at(-1)!.slice(8))}일`}
        </strong>
        <Row>
          <Button
            variant="ghost"
            aria-label="이전 주"
            onClick={() => setSelected(movePlanDate(selected, 'week', -1))}
          >
            <ChevronLeft size={16} />
          </Button>
          <Button variant="ghost" onClick={() => setSelected(today)}>
            오늘
          </Button>
          <Button
            variant="ghost"
            aria-label="다음 주"
            onClick={() => setSelected(movePlanDate(selected, 'week', 1))}
          >
            <ChevronRight size={16} />
          </Button>
        </Row>
      </Between>
      <Rail ref={rail} role="tablist" aria-label="운동 날짜">
        {dates.map((date, i) => (
          <DayTab
            key={date}
            id={`plan-tab-${date}`}
            selected={date === selected}
            today={date === today}
            role="tab"
            aria-controls="plan-date-panel"
            aria-selected={date === selected}
            tabIndex={date === selected ? 0 : -1}
            onClick={() => setSelected(date)}
            onKeyDown={(event) => {
              const next =
                event.key === 'ArrowRight'
                  ? (i + 1) % dates.length
                  : event.key === 'ArrowLeft'
                    ? (i - 1 + dates.length) % dates.length
                    : event.key === 'Home'
                      ? 0
                      : event.key === 'End'
                        ? dates.length - 1
                        : -1;
              if (next < 0) return;
              event.preventDefault();
              setSelected(dates[next]);
              document.getElementById(`plan-tab-${dates[next]}`)?.focus({ preventScroll: true });
            }}
          >
            <small>{weekdays[new Date(`${date}T12:00:00`).getDay()]}</small>
            <strong>{Number(date.slice(8))}</strong>
            <small>{date === today ? '오늘' : dayFor(date) ? '운동' : '휴식'}</small>
          </DayTab>
        ))}
      </Rail>
      <Muted>{state.plan.name} · 매주 반복</Muted>
      <Workspace>
        <div role="tabpanel" id="plan-date-panel" aria-labelledby={`plan-tab-${selected}`}>
          <Routine day={day} onExercise={setDetail} />
        </div>
        <Stack>
          <Card>
            <Row>
              <Focus color={c.accent} size={21} />
              <Title>이번 주 밸런스</Title>
            </Row>
            <Muted style={{ display: 'block', margin: '12px 0 20px', fontSize: 12 }}>
              주요 부위별 계획 세트 수
            </Muted>
            <div
              style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 16 }}
            >
              {[...muscleSets].map(([muscle, sets]) => (
                <div key={muscle}>
                  <Between style={{ fontSize: 13, marginBottom: 7 }}>
                    <span>{muscle}</span>
                    <Muted>{sets}세트</Muted>
                  </Between>
                  <div style={{ height: 6, borderRadius: 4, background: c.border }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${(sets / maxSets) * 100}%`,
                        background: c.accent,
                        borderRadius: 4,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <Muted style={{ display: 'block', marginTop: 18, fontSize: 11 }}>
              세트 수 분포이며 실제 자극 강도를 뜻하지 않아요.
            </Muted>
          </Card>
          <Card style={{ background: `linear-gradient(140deg,${c.navy},${c.surface})` }}>
            <Row>
              <Sparkles color={c.green} />
              <Title>AI 코치의 한마디</Title>
            </Row>
            <p style={{ color: c.green, lineHeight: 1.8, marginTop: 20 }}>
              꾸준한 움직임이 변화를 만들어요.
            </p>
            <Muted>운동을 눌러 자극 부위와 자세를 확인하고, 내 페이스에 맞게 시작해보세요.</Muted>
          </Card>
          <Card>
            <Row>
              <CalendarDays size={19} color={c.muted} />
              <Title>다가오는 운동</Title>
            </Row>
            {upcoming.map((date) => (
              <Button
                key={date}
                variant="ghost"
                style={{
                  width: '100%',
                  marginTop: 12,
                  justifyContent: 'space-between',
                  textAlign: 'left',
                }}
                onClick={() => setSelected(date)}
              >
                <span>
                  <Muted style={{ fontSize: 12 }}>
                    {Number(date.slice(5, 7))}/{Number(date.slice(8))} ·{' '}
                    {weekdays[new Date(`${date}T12:00:00`).getDay()]}요일
                  </Muted>
                  <div style={{ marginTop: 6 }}>{dayFor(date)!.title}</div>
                </span>
                <ArrowUpRight size={16} />
              </Button>
            ))}
          </Card>
        </Stack>
      </Workspace>
      {detail && (
        <ExerciseDetailModal
          exercise={detail}
          onClose={() => setDetail(null)}
          onSelect={(id) =>
            setDetail(
              state.plan.days.flatMap((d) => d.exercises).find((e) => e.exerciseId === id) ?? {
                id: 'preview',
                exerciseId: id,
                sets: 1,
                reps: 10,
                weight: 0,
                duration: 30,
                restSeconds: 60,
              },
            )
          }
        />
      )}
    </Stack>
  );
}
