import { View } from 'react-native';
import { Card, Title, Text, Muted, Button, ButtonText } from '../../components/common/ui.native';
import { colors, typography } from '../../styles';
export function DesignSystem() {
  return (
    <>
      <Card>
        <Title>Typography</Title>
        {Object.entries(typography)
          .filter(([, v]) => typeof v === 'number')
          .map(([key, value]) => (
            <Text key={key} style={{ fontSize: Number(value), lineHeight: Number(value) * 1.4 }}>
              {key} · {value}px
            </Text>
          ))}
      </Card>
      <Card>
        <Title>Color</Title>
        {Object.entries(colors).map(([key, value]) => (
          <View key={key} style={{ flexDirection: 'row', gap: 12, marginVertical: 8 }}>
            <View
              style={{
                width: 30,
                height: 30,
                backgroundColor: value,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            />
            <Muted>
              {key} · {value}
            </Muted>
          </View>
        ))}
      </Card>
      <Card>
        <Title>Component</Title>
        <Text>Emotion Native 공통 카드와 버튼</Text>
        <Button>
          <ButtonText>Button</ButtonText>
        </Button>
      </Card>
    </>
  );
}
