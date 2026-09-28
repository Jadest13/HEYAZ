import { Alert, Switch, View } from 'react-native';
import { useApp } from '../../hooks/useApp';
import { Card, Text, Title, Muted, Button, ButtonText } from '../../components/common/ui.native';
import { initialState } from '../../mocks/initial';
import { coachAllowance } from '../../domain/coachPolicy';
export function SettingsScreen({ onDesignSystem }: { onDesignSystem: () => void }) {
  const { state, update } = useApp();
  const a = coachAllowance(state);
  return (
    <>
      <Card>
        <Title>AI 코치 이용량</Title>
        <Text>
          {state.paidPlan ? '유료 테스트' : '무료'} · {a.remaining}/{a.limit}회 남음
        </Text>
        <Muted>갱신: {new Date(a.resetAt).toLocaleDateString()}</Muted>
        <Muted>무료 15일 5회 / 유료 매월 100회. 운동 외 질문·추가 질문 뒤 수정 3회 무료.</Muted>
      </Card>
      <Card>
        <Title>테스트</Title>
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Text>유료 플랜 ON/OFF</Text>
          <Switch
            accessibilityLabel="유료 플랜 테스트"
            value={!!state.paidPlan}
            onValueChange={(value) => update((s) => ({ ...s, paidPlan: value }))}
          />
        </View>
        <Button onPress={onDesignSystem}>
          <ButtonText>디자인 시스템</ButtonText>
        </Button>
        <Button
          onPress={() =>
            Alert.alert(
              '데이터 초기화',
              '이 기기의 모든 운동 기록·계획·대화·이용량을 초기화할까요?',
              [
                { text: '취소', style: 'cancel' },
                {
                  text: '초기화',
                  style: 'destructive',
                  onPress: () => update(() => initialState()),
                },
              ],
            )
          }
        >
          <ButtonText>데이터 초기화</ButtonText>
        </Button>
      </Card>
    </>
  );
}
