import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styled from '@emotion/styled';
import {
  Flame,
  Clock3,
  Check,
  ChevronRight,
  ChevronDown,
  CalendarDays,
  ArrowLeft,
} from 'lucide-react';
import { useApp } from '../../hooks/useApp';
import { colors as c } from '../../styles';
import { calories } from '../../domain';
import { exerciseById } from '../../constants/exercises';
import {
  Button,
  Card,
  Between,
  Row,
  Stack,
  Title,
  Muted,
  Tag,
  Select,
  Label,
} from '../../components/common/ui.web';
const Tiles = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  @media (max-width: 760px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    > section:first-of-type {
      grid-column: 1/-1;
    }
  }
`;
const ReportsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;
const labels = { completed: '완료', partial: '일부 완료', skipped: '스킵', pending: '미수행' };
export function BurningArchive() {
  const { state } = useApp();
  const navigate = useNavigate();
  const ended = [...state.burning]
    .filter((b) => b.status === 'ended')
    .sort((a, b) => b.date.localeCompare(a.date));
  const months = [...new Set(ended.map((b) => b.date.slice(0, 7)))];
  const [month, setMonth] = useState(months[0] ?? '');
  const [limit, setLimit] = useState(6);
  const reports = ended.filter((b) => b.date.startsWith(month));
  return (
    <Stack>
      <Between>
        <div>
          <h1>Burning Day</h1>
          <Muted>일상에 쌓인 작은 움직임을 확인해요.</Muted>
        </div>
        <Button onClick={() => navigate('/burning-day/setup')}>
          <Flame size={17} />새 Burning Day
        </Button>
      </Between>
      <Card>
        <Between>
          <Row>
            <CalendarDays size={22} color={c.accent} />
            <div>
              <Title>나의 리포트</Title>
              <Muted>
                {reports.length}일 ·{' '}
                {reports.reduce(
                  (sum, b) => sum + b.events.filter((e) => e.status === 'completed').length,
                  0,
                )}
                회 완료
              </Muted>
            </div>
          </Row>
          {months.length > 0 && (
            <Label style={{ flex: '0 0 150px' }}>
              조회 월
              <Select
                value={month}
                onChange={(e) => {
                  setMonth(e.target.value);
                  setLimit(6);
                }}
              >
                {months.map((m) => (
                  <option key={m} value={m}>
                    {m.replace('-', '년 ')}월
                  </option>
                ))}
              </Select>
            </Label>
          )}
        </Between>
      </Card>
      {reports.length ? (
        <>
          <ReportsGrid>
            {reports.slice(0, limit).map((b) => {
              const done = b.events.filter((e) => e.status === 'completed').length;
              const percent = b.events.length ? Math.round((done / b.events.length) * 100) : 0;
              return (
                <Card key={b.id} style={{ padding: 18 }}>
                  <Between>
                    <div>
                      <strong>{b.date}</strong>
                      <div style={{ marginTop: 7 }}>
                        <Muted style={{ fontSize: 12 }}>
                          완료 {done}/{b.events.length}회 · {percent}%
                        </Muted>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      aria-label={`${b.date} 버닝 데이 리포트`}
                      onClick={() => navigate(`/burning-day/${b.id}/result`)}
                    >
                      <ChevronRight size={17} />
                    </Button>
                  </Between>
                  <div style={{ marginTop: 14, height: 5, background: c.border, borderRadius: 4 }}>
                    <div
                      style={{
                        width: `${percent}%`,
                        height: '100%',
                        background: c.accent,
                        borderRadius: 4,
                      }}
                    />
                  </div>
                </Card>
              );
            })}
          </ReportsGrid>
          {reports.length > limit && (
            <Button variant="ghost" onClick={() => setLimit((n) => n + 6)}>
              리포트 더 보기 ({reports.length - limit})<ChevronDown size={16} />
            </Button>
          )}
        </>
      ) : (
        <Card>
          <Flame color={c.accent} />
          <h2 style={{ marginTop: 16 }}>작은 움직임을 하루에 더해요</h2>
          <Muted>첫 Burning Day를 마치면 여기에 리포트가 모여요.</Muted>
        </Card>
      )}
    </Stack>
  );
}
export function BurningResultScreen() {
  const { state } = useApp();
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const session = state.burning.find((b) => b.id === sessionId);
  if (!session) return <Card>리포트를 찾을 수 없습니다.</Card>;
  const done = session.events.filter((e) => e.status === 'completed');
  const partial = session.events.filter((e) => e.status === 'partial');
  const skipped = session.events.filter((e) => e.status === 'skipped');
  const pending = session.events.filter((e) => e.status === 'pending');
  const percent = session.events.length
    ? Math.round((done.length / session.events.length) * 100)
    : 0;
  const seconds = session.events.reduce(
    (sum, e) =>
      sum + e.duration * (e.status === 'completed' ? 1 : e.status === 'partial' ? 0.5 : 0),
    0,
  );
  const kcal = session.events.reduce(
    (sum, e) => {
      const duration =
        e.duration * (e.status === 'completed' ? 1 : e.status === 'partial' ? 0.5 : 0);
      const estimate = calories(
        state.profile.weight,
        duration / 60,
        exerciseById(e.exerciseId, state.customExercises).met,
      );
      return { min: sum.min + estimate.min, max: sum.max + estimate.max };
    },
    { min: 0, max: 0 },
  );
  return (
    <Stack>
      <Between>
        <div>
          <Tag>BURNING DAY REPORT</Tag>
          <h1 style={{ marginTop: 12 }}>작은 움직임이 쌓인 하루</h1>
          <Muted>
            {session.date} · {session.startTime}–{session.endTime}
            {session.id.startsWith('demo-') ? ' · 예시 기록' : ''}
          </Muted>
        </div>
        <Button variant="ghost" onClick={() => navigate('/burning-day')}>
          <ArrowLeft size={16} />
          리포트 목록
        </Button>
      </Between>
      <Tiles>
        <Card>
          <Row style={{ gap: 20 }}>
            <div
              style={{
                width: 94,
                height: 94,
                borderRadius: '50%',
                background: `conic-gradient(${c.accent} ${percent}%, ${c.border} 0)`,
                padding: 8,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  height: '100%',
                  background: c.surface,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 23,
                  fontWeight: 800,
                }}
              >
                {percent}%
              </div>
            </div>
            <div>
              <Muted>완료율</Muted>
              <h2 style={{ margin: '8px 0' }}>완료 {done.length}회</h2>
              <Muted>전체 {session.events.length}회</Muted>
            </div>
          </Row>
        </Card>
        <Card>
          <Clock3 size={24} color={c.green} />
          <h2 style={{ margin: '16px 0 8px' }}>{Number((seconds / 60).toFixed(1))}분</h2>
          <Muted>예상 운동 시간</Muted>
        </Card>
        <Card>
          <Flame size={24} color={c.accent} />
          <h2 style={{ margin: '16px 0 8px' }}>
            {kcal.min}–{kcal.max}
            <small style={{ fontSize: 12 }}> kcal</small>
          </h2>
          <Muted>체중 {state.profile.weight}kg 기준</Muted>
        </Card>
      </Tiles>
      <Card>
        <Between>
          <Title>오늘의 수행</Title>
          <Tag tone="green">
            <Check size={13} />
            {done.length + partial.length}회 움직였어요
          </Tag>
        </Between>
        <Row style={{ marginTop: 18 }}>
          {[
            [done.length, '완료', c.green],
            [partial.length, '일부 완료', c.activityComplete],
            [skipped.length, '스킵', c.muted],
            ...(pending.length ? [[pending.length, '미수행', c.activityIdle]] : []),
          ].map(([value, label, color]) => (
            <span
              key={label}
              style={{
                padding: '8px 14px',
                borderRadius: 10,
                background: c.background,
                fontSize: 13,
              }}
            >
              <span style={{ color: String(color) }}>●</span> {label} <strong>{value}회</strong>
            </span>
          ))}
        </Row>
        <Muted style={{ display: 'block', fontSize: 12, marginTop: 16 }}>
          일부 완료는 설정 시간의 50%로 추정해요. 소모량은 체중·운동 종류·시간에 따른 예상값이에요.
        </Muted>
      </Card>
      <Card as="details">
        <summary style={{ cursor: 'pointer', listStyle: 'none' }}>
          <Between>
            <Row>
              <CalendarDays size={19} />
              <Title>회차별 상세 기록</Title>
              <Muted>{session.events.length}회</Muted>
            </Row>
            <ChevronDown size={18} />
          </Between>
        </summary>
        <Row style={{ margin: '18px 0' }}>
          {['all', 'completed', 'partial', 'skipped'].map((value) => (
            <Button
              key={value}
              variant={filter === value ? 'soft' : 'ghost'}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {value === 'all' ? '전체' : labels[value as keyof typeof labels]}
            </Button>
          ))}
        </Row>
        <Stack style={{ gap: 0 }}>
          {session.events
            .filter((e) => filter === 'all' || e.status === filter)
            .map((e) => (
              <Between key={e.id} style={{ padding: '13px 0', borderTop: `1px solid ${c.border}` }}>
                <div>
                  <Muted style={{ fontSize: 12 }}>
                    {new Date(e.scheduledAt).toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Muted>
                  <div style={{ marginTop: 5 }}>
                    {exerciseById(e.exerciseId, state.customExercises).name}
                  </div>
                </div>
                <Tag tone={e.status === 'completed' ? 'green' : 'orange'}>{labels[e.status]}</Tag>
              </Between>
            ))}
        </Stack>
        {!session.events.some((e) => filter === 'all' || e.status === filter) && (
          <Muted>해당 상태의 기록이 없어요.</Muted>
        )}
      </Card>
      <Button style={{ alignSelf: 'flex-start' }} onClick={() => navigate('/burning-day/setup')}>
        <Flame size={16} />
        다음 Burning Day 만들기
      </Button>
    </Stack>
  );
}
