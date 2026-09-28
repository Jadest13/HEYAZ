import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styled from '@emotion/styled';
import {
  X,
  Dumbbell,
  Timer,
  History,
  Info,
  HeartPulse,
  Repeat2,
  Weight,
  ClipboardList,
  CheckCircle2,
  MoveRight,
  Link2,
  Focus,
} from 'lucide-react';
import { useApp } from '../../hooks/useApp';
import { exerciseById } from '../../constants/exercises';
import { exerciseGuides } from '../../constants/exerciseGuides';
import type { PlannedExercise } from '../../types';
import { colors as c } from '../../styles';
import { Button, Card, Row, Between, Stack, Title, Muted, Tag } from '../common/ui.web';
import { ExerciseInsight } from './ExerciseInsight.web';
import { BenchIllustration, ExerciseTargetMap } from './ExerciseTargetMap.web';

const Dialog = styled.dialog`
  width: min(1020px, calc(100vw - 32px));
  max-height: 92dvh;
  padding: 0;
  border: 1px solid ${c.border};
  border-radius: 24px;
  background: ${c.background};
  color: ${c.text};
  overflow-y: auto;
  box-shadow: 0 24px 100px #0009;
  &::backdrop {
    background: #070a10c9;
    backdrop-filter: blur(6px);
  }
  @media (max-width: 600px) {
    width: calc(100vw - 20px);
    border-radius: 18px;
    .modal-header {
      padding: 18px !important;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: start;
    }
    .modal-content {
      padding: 16px !important;
    }
    .modal-footer {
      padding: 12px 16px !important;
    }
    #exercise-detail-title {
      font-size: 23px !important;
    }
  }
`;
const Hero = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(280px, 1fr);
  gap: 14px;
  > section {
    padding: 20px;
  }
  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;
const Visual = styled.div`
  display: flex;
  align-items: center;
  > * {
    flex: 1;
    min-width: 0;
  }
  @media (max-width: 440px) {
    .bench-illustration {
      display: none;
    }
  }
`;
const Tiles = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin: 20px 0 14px;
  > div {
    border: 1px solid ${c.border};
    background: #ffffff03;
    border-radius: 12px;
    padding: 18px 5px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    text-align: center;
  }
  svg {
    color: ${c.muted};
  }
  strong {
    font-size: 28px;
    font-variant-numeric: tabular-nums;
  }
  small {
    color: ${c.muted};
  }
`;
const Steps = styled.ol`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  padding: 0;
  list-style: none;
  margin: 20px 0;
  gap: 16px;
  li {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    font-size: 13px;
    line-height: 1.7;
  }
  li + li {
    border-left: 1px solid ${c.border};
    padding-left: 16px;
  }
  .step-number {
    flex-shrink: 0;
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: ${c.accent};
    color: ${c.onAccent};
    font-weight: 750;
  }
  @media (max-width: 700px) {
    grid-template-columns: 1fr;
    li + li {
      border: 0;
      padding-left: 0;
    }
  }
`;
const Recent = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
  > div {
    padding: 14px;
    border: 1px solid ${c.border};
    border-radius: 12px;
    background: #ffffff03;
  }
  strong {
    display: block;
    margin-top: 10px;
    font-size: 13px;
    line-height: 1.6;
  }
  @media (max-width: 650px) {
    grid-template-columns: 1fr;
  }
`;
const englishNames: Record<string, string> = {
  bench: 'BARBELL BENCH PRESS',
  incline: 'INCLINE DUMBBELL PRESS',
  shoulder: 'DUMBBELL SHOULDER PRESS',
  lateral: 'LATERAL RAISE',
  pushdown: 'CABLE PUSHDOWN',
  squat: 'SQUAT',
  row: 'DUMBBELL ROW',
  lunge: 'LUNGE',
  pushup: 'PUSH-UP',
  plank: 'PLANK',
  jump: 'JUMPING JACK',
  walk: 'BRISK WALK',
  run: 'LIGHT RUN',
  cycle: 'INDOOR CYCLING',
};
export function ExerciseDetailModal({
  exercise,
  onClose,
  onSelect,
}: {
  exercise: PlannedExercise;
  onClose: () => void;
  onSelect?: (id: string) => void;
}) {
  const { state } = useApp();
  const ref = useRef<HTMLDialogElement>(null);
  const info = exerciseById(exercise.exerciseId, state.customExercises);
  const guide = exerciseGuides[info.id];
  const previewOnly = exercise.id === 'preview';
  const recent = [...state.sessions]
    .filter((s) => s.records.some((r) => r.exerciseId === info.id && r.status === 'completed'))
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .slice(0, 3);
  const targets = info.targets ?? [info.muscle];
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return createPortal(
    <Dialog
      ref={ref}
      aria-labelledby="exercise-detail-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <Between
        className="modal-header"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 2,
          padding: '22px 26px',
          background: c.surface,
          borderBottom: `1px solid ${c.border}`,
        }}
      >
        <div>
          <Muted style={{ fontSize: 10, letterSpacing: 2.5 }}>EXERCISE GUIDE</Muted>
          <Row style={{ marginTop: 8, gap: 14 }}>
            <h2 id="exercise-detail-title" style={{ margin: 0, fontSize: 28 }}>
              {info.name}
            </h2>
            <Tag>{info.cardio ? '유산소' : info.kind === 'timed' ? '시간 운동' : '근력 운동'}</Tag>
            <Tag tone="green">{info.equipment}</Tag>
          </Row>
          {englishNames[info.id] && (
            <Muted style={{ display: 'block', marginTop: 7, fontSize: 10, letterSpacing: 2 }}>
              {englishNames[info.id]}
            </Muted>
          )}
        </div>
        <Button autoFocus aria-label="운동 상세 닫기" variant="ghost" onClick={onClose}>
          <X size={18} />
        </Button>
      </Between>
      <Stack className="modal-content" style={{ padding: 24, gap: 14 }}>
        <Hero>
          <Card style={{ background: `linear-gradient(135deg, #202a31, ${c.surface})` }}>
            <Row>
              <Focus size={18} color={c.accent} />
              <Title>어디에 자극이 오나요?</Title>
            </Row>
            <Visual>
              {info.id === 'bench' && (
                <div className="bench-illustration">
                  <BenchIllustration />
                </div>
              )}
              <ExerciseTargetMap info={info} />
            </Visual>
            <Row style={{ justifyContent: 'center', gap: 6 }}>
              {targets.map((target, index) => (
                <Tag
                  key={target}
                  style={index > 0 ? { color: c.text, background: '#ffffff09' } : undefined}
                >
                  {target}
                </Tag>
              ))}
            </Row>
            <Muted style={{ display: 'block', textAlign: 'center', fontSize: 10, marginTop: 10 }}>
              자극 부위 개략도 · 주황: 주요 부위 / 연한색: 함께 쓰이는 부위
            </Muted>
          </Card>
          <Card>
            <Row>
              <ClipboardList size={20} color={c.accent} />
              <Title>{previewOnly ? '참고 운동' : '이번 계획'}</Title>
            </Row>
            {previewOnly ? (
              <p style={{ lineHeight: 1.8 }}>
                <Muted>
                  아직 계획에 포함되지 않은 운동이에요. 자세와 자극 부위를 먼저 살펴보세요.
                </Muted>
              </p>
            ) : (
              <>
                <Tiles>
                  <div>
                    <Repeat2 size={23} />
                    <strong>{exercise.sets}</strong>
                    <small>세트</small>
                  </div>
                  <div>
                    {info.kind === 'timed' ? <Timer size={23} /> : <Dumbbell size={23} />}
                    <strong>{info.kind === 'timed' ? exercise.duration : exercise.reps}</strong>
                    <small>{info.kind === 'timed' ? '초 / 세트' : '회 / 세트'}</small>
                  </div>
                  <div>
                    {info.kind === 'timed' ? <HeartPulse size={23} /> : <Weight size={23} />}
                    <strong
                      style={
                        info.kind === 'timed' || info.equipment === '맨몸'
                          ? { fontSize: 19 }
                          : undefined
                      }
                    >
                      {info.kind === 'timed'
                        ? info.cardio
                          ? '유산소'
                          : '유지'
                        : info.equipment === '맨몸'
                          ? '맨몸'
                          : exercise.weight}
                    </strong>
                    <small>
                      {info.kind === 'timed'
                        ? '운동 방식'
                        : info.equipment === '맨몸'
                          ? '자체 체중'
                          : 'kg'}
                    </small>
                  </div>
                </Tiles>
                <Between
                  style={{ padding: 13, background: c.background, borderRadius: 12, fontSize: 13 }}
                >
                  <Row>
                    <Timer size={20} color={c.green} />
                    세트 사이 휴식
                  </Row>
                  <strong>{exercise.restSeconds}초</strong>
                </Between>
                <Muted style={{ display: 'block', marginTop: 12, fontSize: 11 }}>
                  현재 선택한 루틴의 설정값이에요.
                </Muted>
                {info.cardio && (
                  <ExerciseInsight id={info.id} seconds={exercise.duration * exercise.sets} />
                )}
              </>
            )}
          </Card>
        </Hero>
        <Card style={{ padding: 20 }}>
          <Row>
            <MoveRight size={20} color={c.muted} />
            <Title>이렇게 움직여요</Title>
          </Row>
          {guide ? (
            <Steps>
              {guide.steps.map((step, index) => (
                <li key={step}>
                  <span className="step-number">{String(index + 1).padStart(2, '0')}</span>
                  <span>{step}</span>
                </li>
              ))}
            </Steps>
          ) : (
            <p>
              <Muted>
                직접 추가한 운동이에요. 등록한 자극 부위와 현재 계획을 확인할 수 있어요.
              </Muted>
            </p>
          )}
          {guide && (
            <Row
              style={{
                padding: 12,
                background: c.accentSoft,
                border: `1px solid ${c.accent}55`,
                borderRadius: 10,
                alignItems: 'flex-start',
                fontSize: 13,
              }}
            >
              <Info size={18} color={c.accent} />
              <strong style={{ color: c.accent }}>자세 체크</strong>
              <span style={{ flex: 1 }}>{guide.cue}</span>
            </Row>
          )}
          <Muted style={{ display: 'block', fontSize: 11, marginTop: 12 }}>
            호흡을 멈추지 말고 통제 가능한 속도로 움직여요. 통증이 생기면 멈춰주세요.
          </Muted>
        </Card>
        <Card style={{ padding: 20 }}>
          <Row>
            <History size={20} color={c.green} />
            <Title>최근 수행 기록</Title>
          </Row>
          {recent.length ? (
            <Recent>
              {recent.map((session) => {
                const records = session.records.filter(
                  (r) => r.exerciseId === info.id && r.status === 'completed',
                );
                return (
                  <div key={session.id}>
                    <Between style={{ fontSize: 12 }}>
                      <span>{session.date}</span>
                      {session.id.startsWith('demo-') && <Muted>예시</Muted>}
                    </Between>
                    <strong>
                      {records.length}세트 ·{' '}
                      {info.kind === 'timed'
                        ? `총 ${records.reduce((sum, r) => sum + r.duration, 0)}초`
                        : `총 ${records.reduce((sum, r) => sum + r.reps, 0)}회`}
                      {records.some((r) => r.weight)
                        ? ` · 최고 ${Math.max(...records.map((r) => r.weight))}kg`
                        : ''}
                    </strong>
                  </div>
                );
              })}
            </Recent>
          ) : (
            <p>
              <Muted>아직 수행 기록이 없어요.</Muted>
            </p>
          )}
        </Card>
        {!!guide?.alternatives.length && onSelect && (
          <Card style={{ padding: 20 }}>
            <Row>
              <Link2 size={20} color={c.muted} />
              <Title>함께 살펴볼 운동</Title>
            </Row>
            <Row style={{ margin: '14px 0 10px' }}>
              {guide.alternatives.map((id) => (
                <Button
                  key={id}
                  variant="ghost"
                  style={{ flex: '1 1 200px', justifyContent: 'space-between' }}
                  onClick={() => {
                    onSelect(id);
                    ref.current?.scrollTo({ top: 0 });
                    ref.current
                      ?.querySelector<HTMLButtonElement>('[aria-label="운동 상세 닫기"]')
                      ?.focus();
                  }}
                >
                  <Dumbbell size={18} />
                  <span style={{ flex: 1, textAlign: 'left' }}>{exerciseById(id).name}</span>
                  <MoveRight size={16} />
                </Button>
              ))}
            </Row>
            <Muted style={{ fontSize: 11 }}>상세 정보만 열리며 계획은 변경되지 않아요.</Muted>
          </Card>
        )}
        <Muted style={{ fontSize: 11, textAlign: 'center' }}>
          기본 자세 참고:{' '}
          <a
            href="https://www.nasm.org/resource-center/exercise-library"
            target="_blank"
            rel="noreferrer"
          >
            NASM 운동 라이브러리
          </a>{' '}
          ·{' '}
          <a
            href="https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/weight-training/art-20045842"
            target="_blank"
            rel="noreferrer"
          >
            Mayo Clinic 근력 운동 안내
          </a>
        </Muted>
      </Stack>
      <div
        className="modal-footer"
        style={{
          position: 'sticky',
          bottom: 0,
          zIndex: 2,
          padding: '14px 24px',
          background: c.background,
          borderTop: `1px solid ${c.border}`,
        }}
      >
        <Button onClick={onClose} style={{ width: '100%', padding: 14 }}>
          <CheckCircle2 size={20} />
          확인했어요
        </Button>
      </div>
    </Dialog>,
    document.body,
  );
}
