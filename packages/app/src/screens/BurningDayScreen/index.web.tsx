import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Plus, Check } from 'lucide-react';
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
  Input,
  Label,
  Tag,
  Progress,
  Select,
} from '../../components/common/ui.web';
import { createBurning } from '../../domain';
import { BurningArchive } from './Reports.web';
import { exercises, exerciseById } from '../../constants/exercises';
import type { BurningEvent, Exercise } from '../../types';
import { uid } from '../../utils/date';
import { ExerciseInsight } from '../../components/exercise/ExerciseInsight.web';
export function BurningSetupScreen() {
  const { state, update } = useApp();
  const navigate = useNavigate();
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('18:00');
  const [interval, setIntervalValue] = useState(60);
  const [pool, setPool] = useState(['squat', 'pushup', 'lunge', 'plank', 'jump']);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [muscle, setMuscle] = useState('전신');
  const [kind, setKind] = useState<'strength' | 'timed' | 'cardio'>('strength');
  const allExercises = [...exercises, ...(state.customExercises ?? [])];
  const addExercise = () => {
    const title = name.trim();
    if (!title || !muscle.trim()) {
      setError('운동 이름과 자극 부위를 입력해주세요.');
      return;
    }
    if (
      allExercises.some(
        (e) => e.name.replace(/\s/g, '').toLowerCase() === title.replace(/\s/g, '').toLowerCase(),
      )
    ) {
      setError('같은 이름의 운동이 이미 있어요. 목록에서 선택해주세요.');
      return;
    }
    const exercise: Exercise = {
      id: `custom-${uid()}`,
      name: title,
      muscle: muscle.trim(),
      targets: [muscle.trim()],
      equipment: '직접 추가',
      kind: kind === 'strength' ? 'strength' : 'timed',
      cardio: kind === 'cardio',
      met: kind === 'cardio' ? 5 : 3,
    };
    update((s) => ({ ...s, customExercises: [...(s.customExercises ?? []), exercise] }));
    setPool((p) => [...p, exercise.id]);
    setName('');
    setAdding(false);
    setError('');
  };
  return (
    <Stack>
      <div>
        <h1>
          <Flame /> Burning Day 설정
        </h1>
        <Muted>일상 속 짧은 운동, 나만의 간격으로 시작하세요.</Muted>
      </div>
      <Card>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (adding) {
              addExercise();
              return;
            }
            try {
              if (state.burning.some((b) => b.status === 'active'))
                throw new Error('진행 중인 Burning Day를 먼저 종료해주세요.');
              const session = createBurning(start, end, interval, pool);
              update((s) => ({ ...s, burning: [...s.burning, session] }));
              navigate('/burning-day');
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          <Grid columns={3}>
            <Label>
              시작 시간
              <Input
                required
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </Label>
            <Label>
              종료 시간
              <Input required type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
            </Label>
            <Label>
              운동 간격(분)
              <Input
                type="number"
                min={5}
                max={240}
                required
                value={interval}
                onChange={(e) => setIntervalValue(Number(e.target.value))}
              />
            </Label>
          </Grid>
          <Title style={{ marginTop: 30 }}>운동 풀</Title>
          <Muted>
            선택한 {pool.length}개 운동에서 추첨해요. 원하는 운동을 직접 추가할 수도 있어요.
          </Muted>
          <Row style={{ margin: '20px 0' }}>
            {allExercises.map((e) => (
              <Button
                type="button"
                variant={pool.includes(e.id) ? 'primary' : 'ghost'}
                key={e.id}
                aria-pressed={pool.includes(e.id)}
                onClick={() =>
                  setPool((p) => (p.includes(e.id) ? p.filter((id) => id !== e.id) : [...p, e.id]))
                }
              >
                {pool.includes(e.id) && <Check size={14} />}
                {e.name}
              </Button>
            ))}
          </Row>
          <Button type="button" variant="soft" onClick={() => setAdding((value) => !value)}>
            <Plus size={16} />
            운동 직접 추가
          </Button>
          {adding && (
            <Card style={{ marginTop: 16 }}>
              <Title>나만의 운동</Title>
              <Grid columns={3} style={{ margin: '16px 0' }}>
                <Label>
                  운동 이름
                  <Input
                    maxLength={40}
                    placeholder="예: 계단 오르기"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </Label>
                <Label>
                  자극 부위
                  <Input
                    maxLength={80}
                    placeholder="예: 허벅지, 둔근"
                    value={muscle}
                    onChange={(e) => setMuscle(e.target.value)}
                  />
                </Label>
                <Label>
                  기록 방식
                  <Select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
                    <option value="strength">횟수 운동</option>
                    <option value="timed">시간 운동</option>
                    <option value="cardio">유산소 · 시간</option>
                  </Select>
                </Label>
              </Grid>
              <Row>
                <Button type="button" onClick={addExercise}>
                  추가하고 선택
                </Button>
                <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
                  취소
                </Button>
              </Row>
            </Card>
          )}
          <div style={{ marginTop: 20 }} />
          {error && <p role="alert">{error}</p>}
          <Button type="submit">Burning Day 시작</Button>
          <p>
            <Muted>
              오늘의 일정으로 생성됩니다. 알림 시각이 지나면 진행 화면에서 수행할 수 있습니다.
              백그라운드 알림은 미연결 상태입니다.
            </Muted>
          </p>
        </form>
      </Card>
    </Stack>
  );
}
export function BurningScreen() {
  const { state, update } = useApp();
  const navigate = useNavigate();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const session = state.burning.find((b) => b.status === 'active');
  if (!session) return <BurningArchive />;
  const next = session.events.find((e) => e.status === 'pending');
  const processed = session.events.filter((e) => e.status !== 'pending').length;
  const mutate = (id: string, status: BurningEvent['status']) =>
    update((s) => ({
      ...s,
      burning: s.burning.map((b) =>
        b.id === session.id
          ? {
              ...b,
              events: b.events.map((e) =>
                e.id === id && e.status === 'pending' ? { ...e, status } : e,
              ),
            }
          : b,
      ),
    }));
  return (
    <Stack>
      <Between>
        <div>
          <Tag>ACTIVE</Tag>
          <h1 style={{ marginTop: 12 }}>🔥 Burning Day</h1>
          <Muted>
            {session.startTime} — {session.endTime} · {session.interval}분마다
          </Muted>
        </div>
        <Button
          variant="ghost"
          onClick={() => {
            update((s) => ({
              ...s,
              burning: s.burning.map((b) =>
                b.id === session.id
                  ? {
                      ...b,
                      status: 'ended',
                      events: b.events.map((e) =>
                        e.status === 'pending' ? { ...e, status: 'skipped' } : e,
                      ),
                    }
                  : b,
              ),
            }));
            navigate(`/burning-day/${session.id}/result`);
          }}
        >
          종료하고 리포트 보기
        </Button>
      </Between>
      <Card>
        <Between>
          <Title>오늘의 진행</Title>
          <Tag>
            {processed} / {session.events.length}
          </Tag>
        </Between>
        <Progress value={(processed / session.events.length) * 100} />
      </Card>
      {next ? (
        <Card>
          <Tag>{now >= next.scheduledAt ? '움직일 시간이에요' : '다음 운동'}</Tag>
          <h2 style={{ marginTop: 20 }}>
            {exerciseById(next.exerciseId, state.customExercises).name}
          </h2>
          <ExerciseInsight id={next.exerciseId} seconds={next.duration} />
          <p>
            {exerciseById(next.exerciseId, state.customExercises).kind === 'timed'
              ? `${next.duration}초`
              : `${next.reps}회`}{' '}
            ·{' '}
            {new Date(next.scheduledAt).toLocaleTimeString('ko-KR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
          <Row>
            <Label>
              횟수
              <Input
                type="number"
                min={1}
                max={100}
                value={next.reps}
                onChange={(e) =>
                  update((s) => ({
                    ...s,
                    burning: s.burning.map((b) =>
                      b.id === session.id
                        ? {
                            ...b,
                            events: b.events.map((ev) =>
                              ev.id === next.id
                                ? {
                                    ...ev,
                                    reps: Math.max(1, Math.min(100, Number(e.target.value))),
                                  }
                                : ev,
                            ),
                          }
                        : b,
                    ),
                  }))
                }
              />
            </Label>
            <Label>
              운동 시간(초)
              <Input
                type="number"
                min={5}
                max={600}
                value={next.duration}
                onChange={(e) =>
                  update((s) => ({
                    ...s,
                    burning: s.burning.map((b) =>
                      b.id === session.id
                        ? {
                            ...b,
                            events: b.events.map((ev) =>
                              ev.id === next.id
                                ? {
                                    ...ev,
                                    duration: Math.max(5, Math.min(600, Number(e.target.value))),
                                  }
                                : ev,
                            ),
                          }
                        : b,
                    ),
                  }))
                }
              />
            </Label>
          </Row>
          <Row style={{ marginTop: 20 }}>
            {(['completed', 'partial', 'skipped'] as const).map((status, i) => (
              <Button
                key={status}
                variant={i === 0 ? 'primary' : 'ghost'}
                disabled={now < next.scheduledAt}
                onClick={() => mutate(next.id, status)}
              >
                {['완료', '일부 완료', '이번엔 스킵'][i]}
              </Button>
            ))}
            <Button
              variant="soft"
              disabled={session.pool.length < 2}
              onClick={() =>
                update((s) => ({
                  ...s,
                  burning: s.burning.map((b) =>
                    b.id === session.id
                      ? {
                          ...b,
                          events: b.events.map((e) =>
                            e.id === next.id
                              ? {
                                  ...e,
                                  exerciseId:
                                    session.pool[
                                      (session.pool.indexOf(e.exerciseId) + 1) % session.pool.length
                                    ],
                                }
                              : e,
                          ),
                        }
                      : b,
                  ),
                }))
              }
            >
              다른 운동
            </Button>
          </Row>
        </Card>
      ) : (
        <Card>
          <Title>오늘 일정을 모두 확인했어요!</Title>
          <Muted>종료 버튼을 눌러 리포트를 확인하세요.</Muted>
        </Card>
      )}
      <Card>
        <Title>오늘의 타임라인</Title>
        {session.events.map((e) => (
          <Between key={e.id} style={{ marginTop: 18 }}>
            <span>
              {new Date(e.scheduledAt).toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              · {exerciseById(e.exerciseId, state.customExercises).name}
            </span>
            <Tag tone={e.status === 'completed' ? 'green' : 'orange'}>
              {
                { pending: '예정', completed: '완료', partial: '일부 완료', skipped: '스킵' }[
                  e.status
                ]
              }
            </Tag>
          </Between>
        ))}
      </Card>
    </Stack>
  );
}
export { BurningResultScreen } from './Reports.web';
