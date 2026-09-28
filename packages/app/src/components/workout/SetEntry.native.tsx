import { useState } from 'react';
import { Alert } from 'react-native';
import { ExerciseFields } from '../exercise/ExerciseFields';
import { Card, Title, Muted, Button, ButtonText } from '../common/ui.native';
import type { PlannedExercise } from '../../types';
import { exerciseFields, exerciseSummary, normalizeExercise } from '../../domain/exerciseFields';
import { exerciseById } from '../../constants/exercises';
export function SetEntry({
  planned,
  count,
  onComplete,
}: {
  planned: PlannedExercise;
  count: number;
  onComplete: (actual: PlannedExercise) => void;
}) {
  const [actual, setActual] = useState(() => normalizeExercise(planned));
  return (
    <Card>
      <Title>
        {exerciseById(planned.exerciseId).name} · {count}/{planned.sets}
      </Title>
      <Muted>목표 {exerciseSummary(planned)}</Muted>
      <ExerciseFields
        value={actual}
        fields={exerciseFields(planned.exerciseId).filter(
          (f) => f !== 'sets' && f !== 'restSeconds',
        )}
        onChange={setActual}
      />
      <Button
        disabled={count >= planned.sets}
        onPress={() => {
          const fields = exerciseFields(planned.exerciseId);
          if (
            fields.some((f) => !Number.isFinite(actual[f])) ||
            actual.weight < 0 ||
            actual.weight > 1000 ||
            actual.reps < 0 ||
            actual.reps > 500 ||
            actual.duration < 1 ||
            actual.duration > 7200
          ) {
            Alert.alert('입력 확인', '실제 수행 수치를 확인해주세요.');
            return;
          }
          onComplete(normalizeExercise(actual));
        }}
      >
        <ButtonText>
          {count >= planned.sets ? '세트 기록 완료' : '실제 수행값으로 세트 완료'}
        </ButtonText>
      </Button>
    </Card>
  );
}
