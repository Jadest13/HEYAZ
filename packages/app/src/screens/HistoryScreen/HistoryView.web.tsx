import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame } from 'lucide-react';
import styled from '@emotion/styled';
import { useApp } from '../../hooks/useApp';
import {
  Button,
  Card,
  Between,
  Row,
  Stack,
  Title,
  Muted,
  Tag,
  Empty,
} from '../../components/common/ui.web';
import { ActivityPulse, activityColors } from '../../components/workout/ActivityPulse.web';
import { dailyActivity, activityLabels } from '../../domain/activity';
import { planDates, movePlanDate } from '../../utils/planDates';
import { localDate } from '../../utils/date';
import { weekdays } from '../../constants/exercises';
import { colors as c } from '../../styles';
import { volume, sessionMinutes } from '../../domain';
const Day = styled.button<{ selected: boolean }>`
  border: 1px solid ${(p) => (p.selected ? c.accent : c.border)};
  border-radius: 10px;
  background: ${c.surface};
  color: ${c.text};
  padding: 10px 0;
  cursor: pointer;
  min-width: 0;
  font: inherit;
  position: relative;
  container-type: inline-size;
  isolation: isolate;
  overflow: hidden;
  > svg,
  > div,
  > span {
    position: relative;
    z-index: 1;
  }
`;
const DayNumber = styled.strong`
  position: absolute;
  inset: 0;
  z-index: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: min(110px, 90cqw);
  font-weight: 900;
  letter-spacing: -0.08em;
  line-height: 1;
  color: ${c.muted};
  opacity: 0.16;
  pointer-events: none;
`;
export function HistoryScreen() {
  const { state } = useApp();
  const navigate = useNavigate();
  const [month, setMonth] = useState(localDate());
  const [selected, setSelected] = useState(
    () =>
      [...state.sessions]
        .filter((s) => s.date.slice(0, 7) === localDate().slice(0, 7))
        .sort((a, b) => b.date.localeCompare(a.date))[0]?.date ?? localDate(),
  );
  const [view, setView] = useState<'calendar' | 'cards'>('calendar');
  const dates = planDates(month, 'month');
  const activity = dailyActivity(state, selected);
  const allSessions = state.sessions.filter((s) => s.date === selected);
  return (
    <Stack>
      <Between>
        <div>
          <h1>운동 기록</h1>
          <Muted>나의 움직임이 만드는 하루의 파동.</Muted>
          {state.sessions.some((s) => s.id.startsWith('demo-')) && (
            <div>
              <Tag>예시 운동 기록 포함</Tag>
            </div>
          )}
        </div>
        <Button variant="ghost" onClick={() => navigate('/analytics')}>
          분석 보기
        </Button>
      </Between>
      <Between>
        <Row>
          <Button
            variant="ghost"
            aria-label="이전 달"
            onClick={() => {
              const next = movePlanDate(month, 'month', -1);
              setMonth(next);
              setSelected(next);
            }}
          >
            ←
          </Button>
          <Title>
            {month.slice(0, 4)}년 {Number(month.slice(5, 7))}월
          </Title>
          <Button
            variant="ghost"
            aria-label="다음 달"
            onClick={() => {
              const next = movePlanDate(month, 'month', 1);
              setMonth(next);
              setSelected(next);
            }}
          >
            →
          </Button>
        </Row>
        <Row>
          {(['calendar', 'cards'] as const).map((v) => (
            <Button
              key={v}
              aria-pressed={view === v}
              variant={view === v ? 'primary' : 'ghost'}
              onClick={() => setView(v)}
            >
              {v === 'calendar' ? '달력 보기' : '카드 보기'}
            </Button>
          ))}
        </Row>
      </Between>
      <Row>
        {activityLabels.map((label, i) => (
          <Muted key={label} style={{ color: activityColors[i] }}>
            ● {label}
          </Muted>
        ))}
        <Muted>🔥 Burning Day 수행</Muted>
      </Row>
      <Muted>
        완료 기록과 다른 수행 기록이 같은 날 있으면 추가 운동으로 표시합니다. 색상은 운동량 표시이며
        건강 위험도를 뜻하지 않습니다.
      </Muted>
      {view === 'calendar' ? (
        <Card style={{ padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', gap: 6 }}>
            {weekdays.map((w) => (
              <Muted key={w} style={{ textAlign: 'center' }}>
                {w}
              </Muted>
            ))}
            {Array.from({ length: new Date(`${dates[0]}T12:00:00`).getDay() }, (_, i) => (
              <span key={`blank-${i}`} />
            ))}
            {dates.map((date) => {
              const a = dailyActivity(state, date);
              return (
                <Day
                  selected={selected === date}
                  key={date}
                  aria-pressed={selected === date}
                  aria-label={`${date} ${a.label}${a.burning ? ' Burning Day 수행' : ''}`}
                  onClick={() => setSelected(date)}
                >
                  <DayNumber aria-hidden="true">{Number(date.slice(8))}</DayNumber>
                  <span aria-hidden="true" style={{ display: 'block', height: 24 }} />
                  <ActivityPulse level={a.level} />
                  {a.burning ? (
                    <Flame size={15} color={c.accent} />
                  ) : (
                    <span style={{ display: 'block', height: 18 }} />
                  )}
                </Day>
              );
            })}
          </div>
        </Card>
      ) : (
        <div
          aria-label="날짜별 연속 운동 파동"
          style={{ display: 'flex', overflowX: 'auto', paddingBottom: 18 }}
        >
          {dates.map((date) => {
            const a = dailyActivity(state, date);
            return (
              <Day
                selected={selected === date}
                key={date}
                onClick={() => setSelected(date)}
                aria-pressed={selected === date}
                style={{
                  flex: '0 0 180px',
                  borderRadius: 0,
                  borderLeft: 0,
                  borderRight: 0,
                  padding: '18px 0',
                }}
              >
                <DayNumber aria-hidden="true">{Number(date.slice(8))}</DayNumber>
                <span>
                  {Number(date.slice(5, 7))}/{Number(date.slice(8))} ·{' '}
                  {weekdays[new Date(`${date}T12:00:00`).getDay()]}
                </span>
                <ActivityPulse level={a.level} />
                <Muted style={{ color: activityColors[a.level] }}>{a.label}</Muted>
                <div style={{ height: 24, marginTop: 8 }}>
                  {a.burning && <Flame size={18} color={c.accent} />}
                </div>
              </Day>
            );
          })}
        </div>
      )}
      <Between>
        <Title>{selected} 기록</Title>
        <Tag>{activity.label}</Tag>
      </Between>
      {allSessions.length ? (
        allSessions.map((s) => (
          <Card key={s.id}>
            <Between>
              <div>
                <h3>{s.day.title}</h3>
                <Muted>
                  {sessionMinutes(s)}분 · {volume(s).toLocaleString()}kg ·{' '}
                  {s.status === 'active'
                    ? '진행 중'
                    : s.status === 'completed'
                      ? '완료'
                      : '부분 완료'}
                </Muted>
              </div>
              <Button
                variant="ghost"
                onClick={() => navigate(s.status === 'active' ? '/workout' : `/history/${s.id}`)}
              >
                {s.status === 'active' ? '이어서 운동' : '상세 보기'}
              </Button>
            </Between>
          </Card>
        ))
      ) : (
        <Card>
          <Empty>이 날짜의 정규 운동 기록이 없습니다.</Empty>
        </Card>
      )}
      {state.burning
        .filter((b) => b.date === selected)
        .map((b) => (
          <Card key={b.id}>
            <Between>
              <Row>
                <Flame color={c.accent} />
                <div>
                  <Title>Burning Day</Title>
                  <Muted>
                    {b.events.filter((e) => e.status === 'completed').length}회 완료 ·{' '}
                    {b.events.filter((e) => e.status === 'partial').length}회 일부 완료
                  </Muted>
                </div>
              </Row>
              <Button
                variant="ghost"
                onClick={() =>
                  navigate(b.status === 'active' ? '/burning-day' : `/burning-day/${b.id}/result`)
                }
              >
                보기
              </Button>
            </Between>
          </Card>
        ))}
    </Stack>
  );
}
