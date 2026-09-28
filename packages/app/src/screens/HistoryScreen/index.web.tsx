import { useState } from 'react';
import {
  Activity,
  Timer,
  Dumbbell,
  Flame,
  Zap,
  CalendarCheck,
  TrendingUp,
  Trophy,
  Sparkles,
} from 'lucide-react';
import { colors as c } from '../../styles';
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
  Empty,
} from '../../components/common/ui.web';
import { TrendChart } from '../../components/body/TrendChart.web';
import { localDate } from '../../utils/date';
import { calories, sessionMinutes, volume } from '../../domain';
import { exerciseById } from '../../constants/exercises';
export { HistoryScreen } from './HistoryView.web';
export function AnalyticsScreen() {
  const { state } = useApp();
  const [period, setPeriod] = useState(30);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - period + 1);
  const sessions = state.sessions.filter(
    (s) => s.status !== 'active' && s.date >= localDate(cutoff),
  );
  const minutes = sessions.reduce((n, s) => n + sessionMinutes(s), 0);
  const totalVolume = sessions.reduce((n, s) => n + volume(s), 0);
  const kcal = calories(state.profile.weight, minutes);
  const burns = state.burning.filter((b) => b.date >= localDate(cutoff));
  const burningCompleted = burns.flatMap((b) => b.events).filter((e) => e.status === 'completed');
  const prs = new Map<string, number>();
  sessions.forEach((s) =>
    s.records
      .filter((r) => r.status === 'completed')
      .forEach((r) => prs.set(r.exerciseId, Math.max(prs.get(r.exerciseId) ?? 0, r.weight))),
  );
  return (
    <Stack>
      <Between>
        <div>
          <h1>나의 변화, 한눈에</h1>
          <Muted>내가 남긴 기록을 바탕으로 분석합니다.</Muted>
          {sessions.some((s) => s.id.startsWith('demo-')) && (
            <div style={{ marginTop: 10 }}>
              <Tag>예시 운동 기록 포함</Tag>
            </div>
          )}
        </div>
        <Row>
          {[7, 30, 90].map((p) => (
            <Button
              key={p}
              variant={period === p ? 'primary' : 'ghost'}
              onClick={() => setPeriod(p)}
            >
              {p}일
            </Button>
          ))}
        </Row>
      </Between>
      <Grid columns={3}>
        {[
          { label: '운동 횟수', value: `${sessions.length}회`, icon: Activity, color: c.accent },
          { label: '총 운동 시간', value: `${minutes}분`, icon: Timer, color: c.activityIdle },
          {
            label: '총 볼륨',
            value: `${totalVolume.toLocaleString()}kg`,
            icon: Dumbbell,
            color: c.purple,
          },
          {
            label: '예상 운동 소모',
            value: `${kcal.min}–${kcal.max} kcal`,
            icon: Flame,
            color: c.accent,
          },
          {
            label: 'Burning Day 완료',
            value: `${burningCompleted.length}회`,
            icon: Zap,
            color: c.activityComplete,
          },
          {
            label: '운동한 날',
            value: `${new Set(sessions.map((s) => s.date)).size}일`,
            icon: CalendarCheck,
            color: c.green,
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} style={{ position: 'relative', overflow: 'hidden' }}>
            <Icon
              aria-hidden="true"
              size={100}
              strokeWidth={1}
              style={{ position: 'absolute', right: -12, bottom: -15, color, opacity: 0.06 }}
            />
            <Row>
              <span
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: `${color}18`,
                  color,
                }}
              >
                <Icon size={21} />
              </span>
              <Muted>{label}</Muted>
            </Row>
            <h2 style={{ marginTop: 15 }}>{value}</h2>
          </Card>
        ))}
      </Grid>
      <Card>
        <Row>
          <TrendingUp size={21} color={c.green} />
          <Title>운동 볼륨 추이</Title>
        </Row>
        <TrendChart
          label="운동 볼륨"
          unit="kg"
          data={[...sessions]
            .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
            .map((s) => ({ date: s.date, value: volume(s) }))}
        />
      </Card>
      <Grid>
        <Card>
          <Row>
            <Trophy size={21} color={c.activityComplete} />
            <Title>운동별 최고 중량 · 선택 기간</Title>
          </Row>
          {prs.size ? (
            [...prs].map(([id, weight]) => (
              <Between key={id} style={{ marginTop: 18 }}>
                <span>{exerciseById(id).name}</span>
                <Tag>{weight}kg</Tag>
              </Between>
            ))
          ) : (
            <Empty>아직 중량 기록이 없습니다.</Empty>
          )}
        </Card>
        <Card style={{ background: `linear-gradient(135deg, ${c.navy}, ${c.surface})` }}>
          <Row>
            <Sparkles size={21} color={c.green} />
            <Title>기록 인사이트</Title>
          </Row>
          <p style={{ marginTop: 20, lineHeight: 1.9 }}>
            {sessions.length
              ? `최근 ${period}일 동안 ${sessions.length}회 운동했어요. 운동량과 회복 상태를 함께 살펴보세요.`
              : '아직 분석할 운동 기록이 없습니다. 운동을 완료하면 시간과 볼륨이 표시됩니다.'}
          </p>
          <Muted>Burning Day는 별도로 집계하며 정규 운동 볼륨에 중복 합산하지 않습니다.</Muted>
        </Card>
      </Grid>
    </Stack>
  );
}
