import { typography as t } from '@heyaz/app/styles/typography';
import styled from '@emotion/styled';
import { colors as c } from '../../styles';
export const Card = styled.section`
  background: ${c.surface};
  border: 1px solid ${c.border};
  border-radius: 18px;
  padding: 24px;
`;
export const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`;
export const Between = styled(Row)`
  justify-content: space-between;
`;
export const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;
export const Grid = styled.div<{ columns?: number }>`
  display: grid;
  grid-template-columns: repeat(${(p) => p.columns ?? 2}, minmax(0, 1fr));
  gap: 20px;
  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;
export const Button = styled.button<{ variant?: 'primary' | 'soft' | 'ghost' | 'danger' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid ${(p) => (p.variant === 'ghost' ? c.border : 'transparent')};
  border-radius: 10px;
  padding: 11px 17px;
  background: ${(p) => (p.variant === 'soft' ? c.accentSoft : p.variant === 'ghost' ? c.surface : p.variant === 'danger' ? c.danger : c.accent)};
  color: ${(p) => (p.variant === 'soft' ? c.accent : p.variant === 'ghost' ? c.text : c.onAccent)};
  font: inherit;
  font-weight: 650;
  cursor: pointer;
  transition:
    transform 0.15s,
    filter 0.15s;
  &:hover {
    filter: brightness(0.97);
    transform: translateY(-1px);
  }
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    transform: none;
  }
`;
export const Input = styled.input`
  width: 100%;
  border: 1px solid ${c.border};
  border-radius: 9px;
  background: ${c.surface};
  color: ${c.text};
  padding: 11px 12px;
  font: inherit;
  min-width: 0;
`;
export const Select = styled.select`
  width: 100%;
  border: 1px solid ${c.border};
  border-radius: 9px;
  padding: 11px;
  background: ${c.surface};
  color: ${c.text};
  font: inherit;
`;
export const Label = styled.label`
  display: flex;
  flex-direction: column;
  gap: 7px;
  font-size: ${t.label}px;
  line-height: 1.5;
  line-height: 1.5;
  color: ${c.muted};
  flex: 1;
  min-width: 95px;
`;
export const Tag = styled.span<{ tone?: 'green' | 'orange' }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border-radius: 6px;
  padding: 5px 8px;
  font-size: ${t.caption}px;
  line-height: 1.5;
  line-height: 1.5;
  font-weight: 650;
  color: ${(p) => (p.tone === 'green' ? c.green : c.accent)};
  background: ${(p) => (p.tone === 'green' ? c.greenSoft : c.accentSoft)};
`;
export const Muted = styled.span`
  color: ${c.muted};
  font-size: ${t.small}px;
  line-height: 1.5;
  line-height: 1.7;
`;
export const Title = styled.h2`
  font-size: ${t.title}px;
  line-height: 1.4;
  margin: 0;
  font-weight: 750;
  letter-spacing: -0.6px;
`;
export const Progress = styled.div<{ value: number }>`
  height: 7px;
  border-radius: 20px;
  background: ${c.border};
  overflow: hidden;
  &:after {
    content: '';
    display: block;
    height: 100%;
    width: ${(p) => Math.max(0, Math.min(100, p.value))}%;
    background: ${c.accent};
    border-radius: 20px;
    transition: width 0.3s;
  }
`;
export const Empty = styled.div`
  padding: 40px 15px;
  text-align: center;
  color: ${c.muted};
  line-height: 1.9;
`;
