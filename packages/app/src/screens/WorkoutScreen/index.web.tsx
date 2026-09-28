import { exerciseFields, normalizeExercise, exerciseSummary } from '../../domain/exerciseFields';
import { typography as t } from '@heyaz/app/styles/typography';
import { clone } from '@heyaz/app/utils/clone';
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Check, Dumbbell, Play } from 'lucide-react';
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
  Input,
  Label,
  Progress,
  Select,
} from '../../components/common/ui.web';
import { exerciseById, exercises } from '../../constants/exercises';
import { ExerciseInsight } from '../../components/exercise/ExerciseInsight.web';
import { localDate, uid, clock } from '../../utils/date';
import { calories, sessionMinutes, volume } from '../../domain';
import type { WorkoutSession } from '../../types';
export function WorkoutScreen() {
  const { state, update } = useApp();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const active = state.sessions.find(
    (s) => s.id === state.activeSessionId && s.status === 'active',
  );
  const [index, setIndex] = useState(0);
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [rpe, setRpe] = useState('');
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const planned = active?.day.exercises[Math.min(index, (active?.day.exercises.length ?? 1) - 1)];
  useEffect(() => {
    setWeight(String(planned?.weight ?? 0));
    setReps(String(planned?.reps ?? 10));
    setRpe('');
  }, [planned?.id, planned?.weight, planned?.reps]);
  const mutate = (fn: (s: WorkoutSession) => WorkoutSession) =>
    update((p) => ({ ...p, sessions: p.sessions.map((s) => (s.id === active?.id ? fn(s) : s)) }));
  if (!active) {
    const day =
      state.plan.days.find((d) => d.id === params.get('day')) ??
      state.plan.days.find((d) => d.dayOfWeek === new Date().getDay()) ??
      state.plan.days[0];
    return (
      <Stack>
        <h1>오늘의 운동을 시작해요</h1>
        {!state.assessments?.length && (
          <Card>
            <Title>처음이라면 나의 시작점을 확인해보세요</Title>
            <p>편안하게 수행한 운동으로 시작 계획을 제안받을 수 있어요.</p>
            <Button variant="soft" onClick={() => navigate('/assessment')}>
              체력 확인 시작
            </Button>
          </Card>
        )}
        <Card>
          <Tag>READY TO MOVE</Tag>
          <h2 style={{ marginTop: 20 }}>{day.title}</h2>
          <Muted>
            {day.exercises.length}개 운동 · 약 {day.estimatedDuration}분
          </Muted>
          <p>세트 완료 후 휴식 타이머가 자동으로 시작됩니다.</p>
          <Button
            onClick={() => {
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
            }}
          >
            <Play size={16} />
            운동 시작
          </Button>
        </Card>
      </Stack>
    );
  }
  if (!planned) return null;
  const exercise = exerciseById(planned.exerciseId);
  const records = active.records.filter((r) => r.id.startsWith(`${planned.id}:`));
  const total = active.day.exercises.reduce((n, e) => n + e.sets, 0);
  const rest = Math.ceil(((active.restUntil ?? 0) - now) / 1000);
  const saveSet = (status: 'completed' | 'skipped') => {
    if (records.length >= planned.sets) return;
    mutate((s) => ({
      ...s,
      restUntil: status === 'completed' ? Date.now() + planned.restSeconds * 1000 : undefined,
      records: [
        ...s.records,
        {
          id: `${planned.id}:${records.length + 1}`,
          exerciseId: planned.exerciseId,
          set: records.length + 1,
          reps: exercise.kind === 'strength' ? Number(reps) : 0,
          weight: exerciseFields(planned.exerciseId).includes('weight') ? Number(weight) : 0,
          duration: exercise.kind === 'timed' ? planned.duration : 0,
          rpe: rpe ? Number(rpe) : undefined,
          status,
          completedAt: new Date().toISOString(),
        },
      ],
    }));
  };
  return (
    <Stack>
      <Between>
        <div>
          <h1>{active.day.title}</h1>
          <Muted>운동 경과 {clock(Math.floor((now - Date.parse(active.startedAt)) / 1000))}</Muted>
        </div>
        <Tag>
          {active.records.length} / {total} 세트
        </Tag>
      </Between>
      <Progress value={(active.records.length / total) * 100} />
      <Grid>
        <Card>
          <Tag>
            EXERCISE {index + 1} / {active.day.exercises.length}
          </Tag>
          <h2 style={{ marginTop: 20 }}>
            <Dumbbell /> {exercise.name}
          </h2>
          <Muted>
            {exercise.muscle} · 목표 {exerciseSummary(planned)}
          </Muted>
          <ExerciseInsight id={planned.exerciseId} seconds={planned.duration * planned.sets} />
          <Row style={{ margin: '24px 0' }}>
            {Array.from({ length: planned.sets }, (_, i) => (
              <Tag key={i} tone={records[i]?.status === 'completed' ? 'green' : 'orange'}>
                {records[i]?.status === 'completed' ? (
                  <Check size={14} />
                ) : records[i]?.status === 'skipped' ? (
                  '스킵'
                ) : (
                  i + 1
                )}{' '}
                세트
              </Tag>
            ))}
          </Row>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveSet('completed');
            }}
          >
            <Row>
              {exerciseFields(planned.exerciseId).includes('weight') && (
                <Label>
                  실제 중량(kg)
                  <Input
                    type="number"
                    required
                    min={0}
                    max={1000}
                    step=".5"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                  />
                </Label>
              )}
              {exercise.kind === 'strength' ? (
                <Label>
                  실제 횟수
                  <Input
                    type="number"
                    min={1}
                    max={500}
                    required
                    value={reps}
                    onChange={(e) => setReps(e.target.value)}
                  />
                </Label>
              ) : (
                <Label>
                  수행 시간(초)
                  <Input
                    type="number"
                    min={1}
                    max={7200}
                    value={planned.duration}
                    onChange={(e) =>
                      mutate((s) => ({
                        ...s,
                        day: {
                          ...s.day,
                          exercises: s.day.exercises.map((p) =>
                            p.id === planned.id ? { ...p, duration: Number(e.target.value) } : p,
                          ),
                        },
                      }))
                    }
                  />
                </Label>
              )}
              <Label>
                RPE (선택)
                <Input
                  type="number"
                  min={1}
                  max={10}
                  step=".5"
                  placeholder="1–10"
                  value={rpe}
                  onChange={(e) => setRpe(e.target.value)}
                />
              </Label>
            </Row>
            <Button
              type="submit"
              disabled={records.length >= planned.sets || rest > 0}
              style={{ width: '100%', marginTop: 20 }}
            >
              <Check size={16} />
              {records.length >= planned.sets ? '이 운동의 세트 기록 완료' : '세트 완료'}
            </Button>
          </form>
          <Between style={{ marginTop: 18 }}>
            <Button variant="ghost" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
              이전 운동
            </Button>
            <Button
              variant="ghost"
              disabled={records.length >= planned.sets}
              onClick={() => saveSet('skipped')}
            >
              세트 스킵
            </Button>
            <Button
              variant="soft"
              disabled={index >= active.day.exercises.length - 1}
              onClick={() => setIndex((i) => i + 1)}
            >
              다음 운동
            </Button>
          </Between>
          <Label style={{ marginTop: 20 }}>
            운동 교체 · 기록 시작 전 가능
            <Select
              value={planned.exerciseId}
              disabled={records.length > 0}
              onChange={(e) =>
                mutate((s) => ({
                  ...s,
                  day: {
                    ...s.day,
                    exercises: s.day.exercises.map((p) =>
                      p.id === planned.id
                        ? normalizeExercise({ ...p, exerciseId: e.target.value })
                        : p,
                    ),
                  },
                }))
              }
            >
              {exercises.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </Select>
          </Label>
        </Card>
        <Stack>
          <Card>
            <Title>휴식 타이머</Title>
            <div
              style={{ fontSize: t.timer, fontWeight: 800, textAlign: 'center', margin: '25px 0' }}
            >
              {clock(Math.max(0, rest))}
            </div>
            <Between>
              <Button
                variant="ghost"
                disabled={rest <= 0}
                onClick={() =>
                  mutate((s) => ({ ...s, restUntil: (s.restUntil ?? Date.now()) + 30000 }))
                }
              >
                +30초
              </Button>
              <Button
                variant="soft"
                onClick={() => mutate((s) => ({ ...s, restUntil: undefined }))}
              >
                휴식 건너뛰기
              </Button>
            </Between>
          </Card>
          <Card>
            <Title>이전 수행 기록</Title>
            {(() => {
              const prev = [...state.sessions]
                .reverse()
                .find(
                  (s) =>
                    s.status !== 'active' &&
                    s.records.some(
                      (r) => r.exerciseId === planned.exerciseId && r.status === 'completed',
                    ),
                );
              return (
                <p style={{ marginTop: 18 }}>
                  <Muted>
                    {prev
                      ? `${prev.date} · ${prev.records
                          .filter(
                            (r) => r.exerciseId === planned.exerciseId && r.status === 'completed',
                          )
                          .map((r) =>
                            exercise.kind === 'timed'
                              ? `${r.duration}초`
                              : `${exerciseFields(r.exerciseId).includes('weight') ? r.weight + 'kg × ' : ''}${r.reps}회`,
                          )
                          .join(' / ')}`
                      : '첫 기록을 남겨보세요.'}
                  </Muted>
                </p>
              );
            })()}
          </Card>
          <Button
            variant="ghost"
            onClick={() => {
              const endedAt = new Date().toISOString();
              mutate((s) => ({
                ...s,
                endedAt,
                restUntil: undefined,
                status:
                  s.records.filter((r) => r.status === 'completed').length === total
                    ? 'completed'
                    : 'partial',
              }));
              update((s) => ({ ...s, activeSessionId: undefined }));
              navigate(`/workout/${active.id}/result`);
            }}
          >
            운동 종료하고 기록 저장
          </Button>
          <Muted>완료하지 않은 세트가 있으면 부분 완료로 저장됩니다.</Muted>
        </Stack>
      </Grid>
    </Stack>
  );
}
export function WorkoutResultScreen() {
  const { state } = useApp();
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const session = state.sessions.find((s) => s.id === sessionId);
  if (!session) return <Card>기록을 찾을 수 없습니다.</Card>;
  const kcal = calories(state.profile.weight, sessionMinutes(session));
  return (
    <Stack>
      <Between>
        <div>
          <Tag tone="green">WORKOUT SAVED</Tag>
          <h1 style={{ marginTop: 14 }}>{session.day.title}</h1>
          <Muted>
            {session.date} ·{' '}
            {session.status === 'completed'
              ? '완료'
              : session.status === 'active'
                ? '진행 중'
                : '부분 완료'}
          </Muted>
        </div>
        <Button onClick={() => navigate('/history')}>전체 기록</Button>
      </Between>
      <Grid columns={3}>
        {[
          ['운동 시간', `${sessionMinutes(session)}분`],
          ['총 볼륨', `${volume(session).toLocaleString()}kg`],
          ['예상 소모', `${kcal.min}–${kcal.max} kcal`],
        ].map(([label, value]) => (
          <Card key={label}>
            <Muted>{label}</Muted>
            <h2 style={{ marginTop: 14 }}>{value}</h2>
          </Card>
        ))}
      </Grid>
      <Card>
        <Title>세트별 기록</Title>
        {session.records.length ? (
          session.records.map((r) => (
            <Between key={r.id} style={{ marginTop: 18 }}>
              <span>
                {exerciseById(r.exerciseId).name} · {r.set}세트
              </span>
              <Muted>
                {r.status === 'skipped'
                  ? '스킵'
                  : exerciseById(r.exerciseId).kind === 'timed'
                    ? `${r.duration}초`
                    : r.weight
                      ? `${r.weight}kg × ${r.reps}회`
                      : `${r.reps}회`}
                {r.rpe ? ` · RPE ${r.rpe}` : ''}
              </Muted>
            </Between>
          ))
        ) : (
          <p style={{ marginTop: 20 }}>완료한 세트가 없습니다.</p>
        )}
      </Card>
    </Stack>
  );
}
