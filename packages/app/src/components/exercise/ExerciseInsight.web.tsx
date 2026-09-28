import { HeartPulse, Focus } from 'lucide-react';
import { exerciseById } from '../../constants/exercises';
import { useApp } from '../../hooks/useApp';
import { calories } from '../../domain';
import { colors as c } from '../../styles';
import { Muted } from '../common/ui.web';

export function ExerciseInsight({ id, seconds = 60 }: { id: string; seconds?: number }) {
  const { state } = useApp();
  const exercise = exerciseById(id, state.customExercises);
  const kcal = calories(state.profile.weight, seconds / 60, exercise.met);
  const Icon = exercise.cardio ? HeartPulse : Focus;
  return (
    <Muted style={{ display: 'block', fontSize: 12, lineHeight: 1.8, marginTop: 6 }}>
      <Icon
        size={13}
        color={exercise.cardio ? c.green : c.accent}
        style={{ verticalAlign: 'middle', marginRight: 5 }}
      />
      자극 · {(exercise.targets ?? [exercise.muscle]).join(' · ')}
      {exercise.cardio && (
        <span style={{ display: 'block', color: c.green }}>
          유산소 · 체중 {state.profile.weight}kg 기준 · {Math.round((seconds / 60) * 10) / 10}분 약{' '}
          {kcal.min}–{kcal.max} kcal
        </span>
      )}
    </Muted>
  );
}
