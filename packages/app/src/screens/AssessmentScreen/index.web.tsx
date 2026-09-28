import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../hooks/useApp';
import { useCoach } from '../../hooks/useCoach';
import {
  Button,
  Card,
  Stack,
  Row,
  Title,
  Muted,
  Select,
  Between,
} from '../../components/common/ui.web';
import { ExerciseFields } from '../../components/exercise/ExerciseFields';
import { exercises, exerciseById } from '../../constants/exercises';
import { normalizeExercise } from '../../domain/exerciseFields';
import { uid, localDate } from '../../utils/date';
import type { PlannedExercise } from '../../types';
export function AssessmentScreen() {
  const { state, update } = useApp();
  const navigate = useNavigate();
  const coach = useCoach();
  const [records, setRecords] = useState<PlannedExercise[]>(() =>
    ['pushup', 'squat', 'plank'].map((exerciseId) =>
      normalizeExercise({
        id: uid(),
        exerciseId,
        sets: 1,
        reps: 5,
        weight: 0,
        duration: 15,
        restSeconds: 60,
      }),
    ),
  );
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const latest = state.assessments?.at(-1);
  return (
    <Stack>
      <div>
        <h1>나의 시작점 알아보기</h1>
        <Muted>편안하게 수행한 운동을 기록하고, 시작 루틴을 제안받으세요.</Muted>
      </div>
      <Card>
        <Title>체력 확인 방법</Title>
        <p>
          선택한 운동을 편안한 범위에서 해본 뒤 실제 세트·횟수·중량·시간으로 바꿔주세요. 아래 숫자는
          입력 예시이며 측정값이 아닙니다.
        </p>
        <Muted>
          최대 횟수나 한계 중량을 시험할 필요는 없습니다. 통증이나 어지러움이 있으면 중단하세요. 이
          기능은 의료 검사나 체력 등급 판정이 아닙니다.
        </Muted>
        <Row style={{ marginTop: 20 }}>
          <Button
            variant="soft"
            onClick={() => {
              navigate('/ai-coach?prompt=체력을 확인할 운동을 추천해줘');
            }}
          >
            코치에게 확인 운동 물어보기
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setSaved(false);
              setRecords((r) => [
                ...r,
                normalizeExercise({
                  id: uid(),
                  exerciseId: 'bench',
                  sets: 1,
                  reps: 5,
                  weight: 0,
                  duration: 15,
                  restSeconds: 60,
                }),
              ]);
            }}
          >
            운동 추가
          </Button>
        </Row>
      </Card>
      {records.map((r, i) => (
        <Card key={r.id}>
          <Between>
            <Select
              aria-label={`확인 운동 ${i + 1}`}
              style={{ maxWidth: 300 }}
              value={r.exerciseId}
              onChange={(e) => {
                setSaved(false);
                setRecords((items) =>
                  items.map((item) =>
                    item.id === r.id
                      ? normalizeExercise({ ...item, exerciseId: e.target.value })
                      : item,
                  ),
                );
              }}
            >
              {exercises.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </Select>
            <Button
              variant="ghost"
              disabled={records.length === 1}
              onClick={() => {
                setSaved(false);
                setRecords((items) => items.filter((item) => item.id !== r.id));
              }}
            >
              삭제
            </Button>
          </Between>
          <div style={{ marginTop: 20 }}>
            <ExerciseFields
              value={r}
              onChange={(next) => {
                setSaved(false);
                setRecords((items) => items.map((item) => (item.id === r.id ? next : item)));
              }}
            />
          </div>
        </Card>
      ))}
      <Button
        onClick={() => {
          try {
            for (const r of records) {
              if (
                !Object.values(r)
                  .filter((v) => typeof v === 'number')
                  .every(Number.isFinite) ||
                r.sets < 1 ||
                r.sets > 20 ||
                !Number.isInteger(r.sets) ||
                (exerciseById(r.exerciseId).kind === 'strength' && r.reps < 1) ||
                r.reps < 0 ||
                r.reps > 500 ||
                !Number.isInteger(r.reps) ||
                r.weight < 0 ||
                r.weight > 1000 ||
                r.duration < 1 ||
                r.duration > 7200 ||
                r.restSeconds < 0 ||
                r.restSeconds > 1800
              )
                throw new Error('세트·횟수·중량·시간을 올바른 범위로 입력해주세요.');
            }
            const summary = records
              .map((r) => `${exerciseById(r.exerciseId).name} ${r.sets}세트 수행`)
              .join(', ');
            update((s) => ({
              ...s,
              assessments: [
                ...(s.assessments ?? []),
                { id: uid(), date: localDate(), records: records.map(normalizeExercise), summary },
              ],
            }));
            setSaved(true);
            setError('');
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        실제 수행 결과 저장
      </Button>
      {saved && latest && (
        <Card>
          <Title>시작점이 기록됐어요</Title>
          <p>{latest.summary}</p>
          <Muted>
            기록한 수행량의 약 70%를 출발점으로 삼는 데모 평가입니다. 계획은 확인 후 적용합니다.
          </Muted>
          <Button
            style={{ marginTop: 20 }}
            disabled={coach.busy}
            onClick={async () => {
              if (await coach.send('체력 검사 기록을 평가해서 시작 계획을 만들어줘'))
                navigate('/ai-coach');
            }}
          >
            평가하고 계획 제안받기 · 코치 이용량 적용
          </Button>
        </Card>
      )}
      {(error || coach.error) && <p role="alert">{error || coach.error}</p>}
    </Stack>
  );
}
