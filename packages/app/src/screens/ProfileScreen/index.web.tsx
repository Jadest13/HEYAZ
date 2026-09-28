import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Select,
  Tag,
} from '../../components/common/ui.web';
import {
  BodyComparisonChart,
  metricOptions,
  type MetricKey,
} from '../../components/body/BodyComparisonChart.web';
import { localDate, uid } from '../../utils/date';
import { weekdays, goalLabels } from '../../constants/exercises';
import type { BodyMetric, Profile } from '../../types';
export function ProfileScreen({ onboarding = false }: { onboarding?: boolean }) {
  const { state, update } = useApp();
  const navigate = useNavigate();
  const [draft, setDraft] = useState(state.profile);
  const [message, setMessage] = useState('');
  const field = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setDraft((p) => ({ ...p, [key]: value }));
  return (
    <Stack>
      <div>
        <Tag>{onboarding ? 'WELCOME TO HEYAZ' : 'MY PROFILE'}</Tag>
        <h1 style={{ marginTop: 16 }}>{onboarding ? '나에게 맞는 운동의 시작' : '마이 프로필'}</h1>
        <Muted>
          {onboarding
            ? '기본 정보만 먼저 알려주세요. 나중에 언제든 수정할 수 있어요.'
            : '목표와 생활이 달라지면, 운동도 나에게 맞게.'}
        </Muted>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.days.length) {
            setMessage('운동 가능 요일을 하나 이상 선택해주세요.');
            return;
          }
          update((s) => ({ ...s, profile: { ...draft, onboarded: true } }));
          if (onboarding) navigate('/home');
          else setMessage('프로필을 저장했습니다. 새 조건은 다음 AI 계획 제안에 사용됩니다.');
        }}
      >
        <Stack>
          <Card>
            <Title>기본 정보</Title>
            <Grid style={{ marginTop: 20 }}>
              <Label>
                이름
                <Input
                  required
                  maxLength={30}
                  value={draft.name}
                  onChange={(e) => field('name', e.target.value)}
                />
              </Label>
              <Label>
                운동 목표
                <Select
                  value={draft.goal}
                  onChange={(e) => field('goal', e.target.value as Profile['goal'])}
                >
                  {Object.entries(goalLabels).map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Label>
              <Label>
                키(cm)
                <Input
                  type="number"
                  min={100}
                  max={250}
                  required
                  value={draft.height}
                  onChange={(e) => field('height', Number(e.target.value))}
                />
              </Label>
              <Label>
                체중(kg)
                <Input
                  type="number"
                  min={20}
                  max={400}
                  step=".1"
                  required
                  value={draft.weight}
                  onChange={(e) => field('weight', Number(e.target.value))}
                />
              </Label>
              <Label>
                목표 체중(kg)
                <Input
                  type="number"
                  min={20}
                  max={400}
                  step=".1"
                  required
                  value={draft.targetWeight}
                  onChange={(e) => field('targetWeight', Number(e.target.value))}
                />
              </Label>
              <Label>
                운동 경험
                <Select
                  value={draft.experience}
                  onChange={(e) => field('experience', e.target.value as Profile['experience'])}
                >
                  <option value="beginner">처음 시작해요</option>
                  <option value="intermediate">꾸준히 하고 있어요</option>
                  <option value="advanced">숙련자예요</option>
                </Select>
              </Label>
            </Grid>
          </Card>
          <Card>
            <Title>운동 환경과 일정</Title>
            <Row style={{ margin: '20px 0' }}>
              {weekdays.map((w, i) => (
                <Button
                  type="button"
                  variant={draft.days.includes(i) ? 'primary' : 'ghost'}
                  key={w}
                  onClick={() =>
                    field(
                      'days',
                      draft.days.includes(i)
                        ? draft.days.filter((d) => d !== i)
                        : [...draft.days, i],
                    )
                  }
                >
                  {w}
                </Button>
              ))}
            </Row>
            <Grid>
              <Label>
                한 번에 가능한 시간(분)
                <Input
                  type="number"
                  min={10}
                  max={180}
                  required
                  value={draft.minutes}
                  onChange={(e) => field('minutes', Number(e.target.value))}
                />
              </Label>
              <Label>
                운동 장소
                <Select value={draft.location} onChange={(e) => field('location', e.target.value)}>
                  <option>헬스장</option>
                  <option>집</option>
                  <option>야외</option>
                </Select>
              </Label>
              <Label>
                사용 가능 장비
                <Input
                  value={draft.equipment}
                  onChange={(e) => field('equipment', e.target.value)}
                />
              </Label>
              <Label>
                피하고 싶은 운동
                <Input
                  placeholder="예: 스쿼트"
                  value={draft.excluded}
                  onChange={(e) => field('excluded', e.target.value)}
                />
              </Label>
            </Grid>
          </Card>
          {message && <p role="status">{message}</p>}
          <Row>
            <Button type="submit">{onboarding ? '나의 운동 시작하기' : '프로필 저장'}</Button>
            {onboarding && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  update((s) => ({ ...s, profile: { ...s.profile, onboarded: true } }));
                  navigate('/home');
                }}
              >
                기본 설정으로 둘러보기
              </Button>
            )}
          </Row>
          <Muted>
            정보는 이 기기에 저장됩니다. 계정 로그인과 기기 간 동기화는 아직 연결되지 않았습니다.
          </Muted>
        </Stack>
      </form>
    </Stack>
  );
}
export function BodyScreen() {
  const { state, update } = useApp();
  const [date, setDate] = useState(localDate());
  const [weight, setWeight] = useState(
    String(state.metrics.at(-1)?.weight ?? state.profile.weight),
  );
  const [fat, setFat] = useState('');
  const [muscle, setMuscle] = useState('');
  const [period, setPeriod] = useState(30);
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>(['weight']);
  const [saved, setSaved] = useState(false);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - period);
  const metrics = [...state.metrics]
    .filter((m) => period === 0 || m.date >= localDate(cutoff))
    .sort((a, b) => a.date.localeCompare(b.date));
  const names = {
    weight: '체중',
    bmi: 'BMI',
    skeletalMuscleMass: '골격근량',
    bodyFatPercentage: '체지방률',
  };
  return (
    <Stack>
      <div>
        <h1>신체 변화</h1>
        <Muted>숫자 하나보다, 꾸준히 이어지는 변화를 살펴보세요.</Muted>
        {state.metrics.some((m) => m.id.startsWith('demo-')) && (
          <div style={{ marginTop: 10 }}>
            <Tag>예시 신체 기록 포함</Tag>
          </div>
        )}
      </div>
      <Card>
        <Title>오늘의 신체 기록</Title>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const w = Number(weight);
            const value: BodyMetric = {
              id: uid(),
              date,
              weight: w,
              height: state.profile.height,
              bmi: Number((w / (state.profile.height / 100) ** 2).toFixed(1)),
              ...(fat ? { bodyFatPercentage: Number(fat) } : {}),
              ...(muscle ? { skeletalMuscleMass: Number(muscle) } : {}),
            };
            update((s) => ({
              ...s,
              metrics: [...s.metrics.filter((m) => m.date !== date), value].sort((a, b) =>
                a.date.localeCompare(b.date),
              ),
            }));
            setSaved(true);
          }}
        >
          <Row style={{ marginTop: 20, alignItems: 'end' }}>
            <Label>
              측정일
              <Input
                required
                type="date"
                max={localDate()}
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setSaved(false);
                }}
              />
            </Label>
            <Label>
              체중(kg)
              <Input
                type="number"
                required
                min={20}
                max={400}
                step=".1"
                value={weight}
                onChange={(e) => {
                  setWeight(e.target.value);
                  setSaved(false);
                }}
              />
            </Label>
            <Label>
              체지방률(선택, %)
              <Input
                type="number"
                min={1}
                max={70}
                step=".1"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
              />
            </Label>
            <Label>
              골격근량(선택, kg)
              <Input
                type="number"
                min={1}
                max={150}
                step=".1"
                value={muscle}
                onChange={(e) => setMuscle(e.target.value)}
              />
            </Label>
            <Button type="submit">{saved ? '저장 완료' : '기록 저장'}</Button>
          </Row>
          <Muted style={{ display: 'block', marginTop: 15 }}>
            동일 날짜 기록은 덮어씁니다. BMI는 저장 당시 키로 계산합니다.
          </Muted>
        </form>
      </Card>
      <Card>
        <Between>
          <Title>변화 추이</Title>
          <Row>
            {[
              [7, '1주'],
              [30, '1개월'],
              [90, '3개월'],
              [180, '6개월'],
              [0, '전체'],
            ].map(([v, l]) => (
              <Button
                variant={period === v ? 'soft' : 'ghost'}
                key={v}
                onClick={() => setPeriod(Number(v))}
              >
                {l}
              </Button>
            ))}
          </Row>
        </Between>
        <Row style={{ margin: '20px 0' }}>
          {Object.entries(names).map(([key, label]) => (
            <Button
              key={key}
              variant={selectedMetrics.includes(key as MetricKey) ? 'soft' : 'ghost'}
              aria-pressed={selectedMetrics.includes(key as MetricKey)}
              style={{ color: metricOptions[key as MetricKey].color }}
              onClick={() =>
                setSelectedMetrics((previous) =>
                  previous.includes(key as MetricKey)
                    ? previous.filter((k) => k !== key)
                    : [...previous, key as MetricKey],
                )
              }
            >
              {label}
            </Button>
          ))}
        </Row>
        <BodyComparisonChart data={metrics} selected={selectedMetrics} />
      </Card>
      <Card>
        <Title>측정 기록</Title>
        {metrics.length ? (
          [...metrics].reverse().map((m) => (
            <Between key={m.id} style={{ marginTop: 18 }}>
              <span>{m.date}</span>
              <Muted>
                {m.weight}kg · BMI {m.bmi}
                {m.skeletalMuscleMass ? ` · 골격근량 ${m.skeletalMuscleMass}kg` : ''}
                {m.bodyFatPercentage ? ` · 체지방 ${m.bodyFatPercentage}%` : ''}
              </Muted>
            </Between>
          ))
        ) : (
          <Muted style={{ display: 'block', marginTop: 20 }}>아직 측정 기록이 없습니다.</Muted>
        )}
      </Card>
    </Stack>
  );
}
