import { useState } from 'react';
import { View } from 'react-native';
import { useApp } from '../../hooks/useApp';
import { useCoach } from '../../hooks/useCoach';
import { ExerciseFields } from '../../components/exercise/ExerciseFields';
import { Card, Text, Title, Muted, Button, ButtonText } from '../../components/common/ui.native';
import { exerciseById, exercises } from '../../constants/exercises';
import { normalizeExercise } from '../../domain/exerciseFields';
import { uid, localDate } from '../../utils/date';
import type { PlannedExercise } from '../../types';
export function AssessmentScreen({ onCoach }: { onCoach: () => void }) {
  const { update } = useApp();
  const coach = useCoach();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
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
  return (
    <>
      <Card>
        <Title>나의 시작점 알아보기</Title>
        <Muted>
          숫자는 예시입니다. 편안한 범위에서 실제 수행한 값으로 바꿔주세요. 통증·어지러움이 있으면
          중단하세요.
        </Muted>
        <Button
          onPress={async () => {
            if (await coach.send('체력을 확인할 운동을 추천해줘')) onCoach();
          }}
        >
          <ButtonText>코치에게 운동 추천받기</ButtonText>
        </Button>
      </Card>
      {records.map((r, i) => (
        <Card key={r.id}>
          <Title>{exerciseById(r.exerciseId).name}</Title>
          <ExerciseFields
            value={r}
            onChange={(value) => {
              setSaved(false);
              setRecords((items) => items.map((item) => (item.id === r.id ? value : item)));
            }}
          />
          <Button
            onPress={() => {
              setSaved(false);
              const next =
                exercises[
                  (exercises.findIndex((e) => e.id === r.exerciseId) + 1) % exercises.length
                ];
              setRecords((items) =>
                items.map((item, j) =>
                  j === i ? normalizeExercise({ ...item, exerciseId: next.id }) : item,
                ),
              );
            }}
          >
            <ButtonText>운동 교체</ButtonText>
          </Button>
        </Card>
      ))}
      <Button
        onPress={() => {
          if (
            records.some(
              (r) =>
                ![r.sets, r.reps, r.weight, r.duration, r.restSeconds].every(Number.isFinite) ||
                r.sets < 1 ||
                r.sets > 20 ||
                r.weight < 0 ||
                r.weight > 1000 ||
                (exerciseById(r.exerciseId).kind === 'strength' && r.reps < 1) ||
                r.reps < 0 ||
                r.reps > 500 ||
                r.duration < 1 ||
                r.duration > 7200 ||
                r.restSeconds < 0 ||
                r.restSeconds > 1800,
            )
          ) {
            setError('수행 수치를 올바르게 입력해주세요.');
            return;
          }
          update((s) => ({
            ...s,
            assessments: [
              ...(s.assessments ?? []),
              {
                id: uid(),
                date: localDate(),
                records: records.map(normalizeExercise),
                summary: `${records.length}종목 수행 결과`,
              },
            ],
          }));
          setSaved(true);
          setError('');
        }}
      >
        <ButtonText>실제 수행 결과 저장</ButtonText>
      </Button>
      {saved && (
        <Button
          disabled={coach.busy}
          onPress={async () => {
            if (await coach.send('체력 검사 기록으로 시작 계획을 만들어줘')) onCoach();
          }}
        >
          <ButtonText>평가하고 계획 제안받기</ButtonText>
        </Button>
      )}
      <View>
        <Text>{error || coach.error}</Text>
      </View>
    </>
  );
}
