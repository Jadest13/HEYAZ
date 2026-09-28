import styled from '@emotion/native';
import { colors as c, typography as t } from '../../styles';
export const Card = styled.View({
  backgroundColor: c.surface,
  borderColor: c.border,
  borderWidth: 1,
  borderRadius: 18,
  padding: 20,
  marginBottom: 16,
});
export const Text = styled.Text({ color: c.text, fontSize: t.body, lineHeight: 27 });
export const Muted = styled.Text({ color: c.muted, fontSize: t.small, lineHeight: 23 });
export const Title = styled.Text({
  color: c.text,
  fontSize: t.title,
  fontWeight: '700',
  lineHeight: 30,
  marginBottom: 12,
});
export const Button = styled.TouchableOpacity({
  padding: 14,
  borderRadius: 10,
  backgroundColor: c.accent,
  marginTop: 12,
  alignItems: 'center',
});
export const ButtonText = styled.Text({ color: c.onAccent, fontSize: t.label, fontWeight: '600' });
