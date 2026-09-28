import { useState } from 'react';
import {
  CalendarDays,
  Clock3,
  Dumbbell,
  Plus,
  ArrowRight,
  ChevronDown,
  Pencil,
  Check,
} from 'lucide-react';
import { Card, Row, Between, Button, Muted, Tag, Stack, Title } from '../common/ui.web';
import { colors as c } from '../../styles';
import { exerciseById, weekdays } from '../../constants/exercises';
import { exerciseSummary } from '../../domain/exerciseFields';
import { planChanges } from '../../domain/planChanges';
import type { PlanChangeProposal, PlannedExercise } from '../../types';
import { ExerciseDetailModal } from './ExerciseDetailModal.web';
export function PlanProposal({
  proposal,
  error,
  onFinish,
}: {
  proposal: PlanChangeProposal;
  error: string;
  onFinish: (status: 'applied' | 'rejected') => void;
}) {
  const [detail, setDetail] = useState<PlannedExercise | null>(null);
  const deltas = planChanges(proposal.before, proposal.after);
  const mode =
    proposal.presentation ?? (deltas.some((d) => d.kind === 'added') ? 'change' : 'week');
  const days =
    mode === 'day'
      ? proposal.after.days.filter((d) => d.dayOfWeek === proposal.focusWeekday)
      : proposal.after.days;
  const exerciseButton = (exercise: PlannedExercise) => (
    <Button
      key={exercise.id}
      variant="ghost"
      onClick={() => setDetail(exercise)}
      style={{
        width: '100%',
        justifyContent: 'space-between',
        textAlign: 'left',
        padding: '12px',
        fontSize: 13,
      }}
    >
      <span>
        <Dumbbell size={14} style={{ marginRight: 7, verticalAlign: 'middle' }} />
        {exerciseById(exercise.exerciseId).name}
      </span>
      <Muted style={{ fontSize: 11 }}>
        {exerciseSummary(exercise).replace(/ · \d+초 휴식$/, '')}
      </Muted>
    </Button>
  );
  return (
    <Card style={{ padding: 18, marginTop: 14, minWidth: 0 }}>
      <Row>
        <CalendarDays size={19} color={c.accent} />
        <Title>
          {mode === 'week' ? '주간 루틴 제안' : mode === 'day' ? '하루 계획 제안' : '변경할 부분'}
        </Title>
      </Row>
      {mode === 'change' ? (
        <Stack style={{ gap: 12, margin: '16px 0' }}>
          {deltas.length ? (
            deltas
              .filter(
                (delta) =>
                  delta.kind !== 'schedule' ||
                  !deltas.some((d) => d.dayOfWeek === delta.dayOfWeek && d.kind === 'added'),
              )
              .map((delta, i) => (
                <div
                  key={i}
                  style={{ padding: 12, border: `1px solid ${c.border}`, borderRadius: 12 }}
                >
                  <Row style={{ gap: 8 }}>
                    <Tag>{weekdays[delta.dayOfWeek]}요일</Tag>
                    <Muted style={{ fontSize: 12 }}>
                      {
                        {
                          added: '운동 추가',
                          removed: '운동 삭제',
                          updated: '운동 수정',
                          moved: '순서 변경',
                          schedule: '일정 변경',
                        }[delta.kind]
                      }
                    </Muted>
                  </Row>
                  {delta.exercise && (
                    <div style={{ marginTop: 10 }}>{exerciseButton(delta.exercise)}</div>
                  )}
                  {(delta.kind === 'added' || delta.kind === 'moved') && (
                    <Row style={{ gap: 6, fontSize: 12, marginTop: 12 }}>
                      <Muted>
                        {delta.beforeId ? `${exerciseById(delta.beforeId).name} 다음` : '루틴 시작'}
                      </Muted>
                      <ArrowRight size={13} color={c.accent} />
                      <Plus size={13} color={c.accent} />
                      <ArrowRight size={13} color={c.accent} />
                      <Muted>
                        {delta.afterId ? `${exerciseById(delta.afterId).name} 앞` : '루틴 끝'}
                      </Muted>
                    </Row>
                  )}
                  {delta.kind === 'updated' && delta.previous && (
                    <Muted style={{ display: 'block', fontSize: 12, marginTop: 8 }}>
                      {exerciseSummary(delta.previous)} → {exerciseSummary(delta.exercise!)}
                    </Muted>
                  )}
                  {delta.description && (
                    <p style={{ marginBottom: 0, fontSize: 12 }}>{delta.description}</p>
                  )}
                </div>
              ))
          ) : (
            <Muted>기존 계획과 동일해요.</Muted>
          )}
        </Stack>
      ) : (
        <>
          <Row style={{ margin: '16px 0', gap: 14, fontSize: 12 }}>
            <Tag>
              <CalendarDays size={13} />
              {days.length}일
            </Tag>
            <Muted>
              <Clock3 size={13} /> {days.reduce((sum, d) => sum + d.estimatedDuration, 0)}분
            </Muted>
            <Muted>
              <Dumbbell size={13} /> {days.reduce((sum, d) => sum + d.exercises.length, 0)}개 운동
            </Muted>
          </Row>
          {days.map((day) => (
            <details
              key={day.id}
              open={mode === 'day' ? true : undefined}
              style={{ padding: '12px 0', borderTop: `1px solid ${c.border}` }}
            >
              <summary style={{ cursor: 'pointer', listStyle: 'none' }}>
                <Between>
                  <Row style={{ gap: 8 }}>
                    <Tag>{weekdays[day.dayOfWeek]}요일</Tag>
                    <strong style={{ fontSize: 13 }}>{day.title}</strong>
                  </Row>
                  <Row style={{ gap: 6 }}>
                    <Muted style={{ fontSize: 12 }}>
                      {day.estimatedDuration}분 · {day.exercises.length}개
                    </Muted>
                    <ChevronDown size={15} />
                  </Row>
                </Between>
              </summary>
              <Stack style={{ gap: 8, marginTop: 12 }}>{day.exercises.map(exerciseButton)}</Stack>
            </details>
          ))}
          <Muted style={{ display: 'block', fontSize: 11, margin: '10px 0 16px' }}>
            요일을 눌러 펼치기 · 운동을 눌러 상세 보기
          </Muted>
        </>
      )}
      {error && (
        <p role="alert" style={{ color: c.danger }}>
          {error}
        </p>
      )}
      {proposal.status === 'pending' ? (
        <Row>
          <Button
            disabled={mode === 'change' && !deltas.length}
            onClick={() => onFinish('applied')}
          >
            <Check size={15} />
            적용하기
          </Button>
          <Button variant="ghost" onClick={() => onFinish('rejected')}>
            <Pencil size={14} />
            기존 계획 유지
          </Button>
        </Row>
      ) : (
        <Tag tone="green">{proposal.status === 'applied' ? '적용 완료' : '기존 계획 유지됨'}</Tag>
      )}
      {detail && <ExerciseDetailModal exercise={detail} onClose={() => setDetail(null)} />}
    </Card>
  );
}
