import styled from '@emotion/native';
import { View } from 'react-native';
import type { PlannedExercise } from '../../types';
import { colors, typography } from '../../styles';
import { exerciseFields, fieldLabels, type ExerciseField } from '../../domain/exerciseFields';
const Caption = styled.Text({
  color: colors.muted,
  fontSize: typography.small,
  lineHeight: 22,
  marginBottom: 6,
});
const NumberInput = styled.TextInput({
  color: colors.text,
  backgroundColor: colors.surface,
  borderColor: colors.border,
  borderWidth: 1,
  borderRadius: 9,
  padding: 12,
  fontSize: typography.body,
  minWidth: 72,
});
export function ExerciseFields({
  value,
  onChange,
  fields,
}: {
  value: PlannedExercise;
  onChange: (value: PlannedExercise) => void;
  fields?: ExerciseField[];
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {(fields ?? exerciseFields(value.exerciseId)).map((key) => (
        <View key={key} style={{ flexGrow: 1, flexBasis: 90 }}>
          <Caption>{fieldLabels[key]}</Caption>
          <NumberInput
            accessibilityLabel={fieldLabels[key]}
            keyboardType="decimal-pad"
            value={Number.isNaN(value[key]) ? '' : String(value[key])}
            onChangeText={(text) => onChange({ ...value, [key]: text.trim() ? Number(text) : NaN })}
          />
        </View>
      ))}
    </View>
  );
}
