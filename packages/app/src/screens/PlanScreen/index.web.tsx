import { ExerciseFields } from '../../components/exercise/ExerciseFields';
import { ExerciseInsight } from '../../components/exercise/ExerciseInsight.web';
import { normalizeExercise } from '../../domain/exerciseFields';
import { colors as c } from '../../styles';
import { clone } from '@heyaz/app/utils/clone';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../../hooks/useApp';
import {
  Button,
  Card,
  Between,
  Row,
  Stack,
  Muted,
  Input,
  Label,
  Select,
} from '../../components/common/ui.web';
import { exercises, weekdays } from '../../constants/exercises';
import { applyPlan } from '../../domain';
import { uid } from '../../utils/date';
export { PlanScreen } from './PlanView.web';
export function PlanEditScreen() {
  const { state, update } = useApp();
  const [draft, setDraft] = useState(() => clone(state.plan));
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const change = (index: number, fn: (day: (typeof draft.days)[number]) => void) =>
    setDraft((p) => {
      const n = clone(p);
      fn(n.days[index]);
      return n;
    });
  return (
    <Stack>
      <Between>
        <div>
          <h1>운동 계획 편집</h1>
          <Muted>저장하기 전까지 기존 계획은 유지됩니다.</Muted>
        </div>
        <Row>
          <Button variant="ghost" onClick={() => navigate('/plan')}>
            취소
          </Button>
          <Button
            onClick={() => {
              try {
                const next = applyPlan(state, draft, draft.revision);
                update(() => next);
                navigate('/plan');
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            계획 저장
          </Button>
        </Row>
      </Between>
      {error && <p role="alert">{error}</p>}
      <Label>
        계획 이름
        <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
      </Label>
      {draft.days.map((day, i) => (
        <Card key={day.id}>
          <Row>
            <Label>
              운동일
              <Select
                value={day.dayOfWeek}
                onChange={(e) =>
                  change(i, (d) => {
                    d.dayOfWeek = Number(e.target.value);
                  })
                }
              >
                {weekdays.map((w, j) => (
                  <option key={w} value={j}>
                    {w}요일
                  </option>
                ))}
              </Select>
            </Label>
            <Label>
              시작 시간
              <Input
                type="time"
                value={day.startTime}
                onChange={(e) =>
                  change(i, (d) => {
                    d.startTime = e.target.value;
                  })
                }
              />
            </Label>
            <Label>
              예상 시간(분)
              <Input
                type="number"
                min={1}
                max={300}
                value={day.estimatedDuration}
                onChange={(e) =>
                  change(i, (d) => {
                    d.estimatedDuration = Number(e.target.value);
                  })
                }
              />
            </Label>
            <Label>
              운동일 이름
              <Input
                value={day.title}
                onChange={(e) =>
                  change(i, (d) => {
                    d.title = e.target.value;
                  })
                }
              />
            </Label>
            <Button
              aria-label="운동일 삭제"
              variant="ghost"
              onClick={() => setDraft({ ...draft, days: draft.days.filter((_, j) => j !== i) })}
            >
              <Trash2 size={16} />
            </Button>
          </Row>
          {day.exercises.map((exercise, j) => (
            <Row
              key={exercise.id}
              style={{
                marginTop: 18,
                paddingTop: 15,
                borderTop: `1px solid ${c.border}`,
                alignItems: 'end',
              }}
            >
              <Label style={{ minWidth: 170 }}>
                운동
                <Select
                  value={exercise.exerciseId}
                  onChange={(e) =>
                    change(i, (d) => {
                      d.exercises[j] = normalizeExercise({
                        ...d.exercises[j],
                        exerciseId: e.target.value,
                      });
                    })
                  }
                >
                  {exercises.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </Select>
              </Label>
              <div style={{ flex: 1, minWidth: 240 }}>
                <ExerciseInsight
                  id={exercise.exerciseId}
                  seconds={exercise.duration * exercise.sets}
                />
                <ExerciseFields
                  value={exercise}
                  onChange={(next) =>
                    change(i, (d) => {
                      d.exercises[j] = next;
                    })
                  }
                />
              </div>
              <Row>
                <Button
                  variant="ghost"
                  aria-label="위로 이동"
                  disabled={j === 0}
                  onClick={() =>
                    change(i, (d) => {
                      [d.exercises[j - 1], d.exercises[j]] = [d.exercises[j], d.exercises[j - 1]];
                    })
                  }
                >
                  <ArrowUp size={14} />
                </Button>
                <Button
                  variant="ghost"
                  aria-label="아래로 이동"
                  disabled={j === day.exercises.length - 1}
                  onClick={() =>
                    change(i, (d) => {
                      [d.exercises[j + 1], d.exercises[j]] = [d.exercises[j], d.exercises[j + 1]];
                    })
                  }
                >
                  <ArrowDown size={14} />
                </Button>
                <Button
                  variant="ghost"
                  aria-label="운동 삭제"
                  onClick={() =>
                    change(i, (d) => {
                      d.exercises.splice(j, 1);
                    })
                  }
                >
                  <Trash2 size={14} />
                </Button>
              </Row>
            </Row>
          ))}
          <Button
            variant="soft"
            style={{ marginTop: 20 }}
            onClick={() =>
              change(i, (d) => {
                d.exercises.push({
                  id: uid(),
                  exerciseId: 'squat',
                  sets: 3,
                  reps: 12,
                  weight: 0,
                  duration: 30,
                  restSeconds: 60,
                });
              })
            }
          >
            <Plus size={15} />
            운동 추가
          </Button>
        </Card>
      ))}
      <Button
        variant="ghost"
        disabled={draft.days.length >= 7}
        onClick={() =>
          setDraft({
            ...draft,
            days: [
              ...draft.days,
              {
                id: uid(),
                dayOfWeek:
                  [1, 2, 3, 4, 5, 6, 0].find(
                    (d) => !draft.days.some((day) => day.dayOfWeek === d),
                  ) ?? 0,
                startTime: '19:00',
                title: '새 운동',
                estimatedDuration: 30,
                exercises: [],
              },
            ],
          })
        }
      >
        <Plus size={16} />
        운동일 추가
      </Button>
    </Stack>
  );
}
