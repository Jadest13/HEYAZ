export const typography = {
  fontFamily: '"Pretendard", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif',
  caption: 13,
  small: 14,
  label: 15,
  body: 16,
  lead: 18,
  title: 22,
  heading: 28,
  display: 36,
  metric: 32,
  timer: 60,
};
export const textStyles = {
  display: {
    fontSize: typography.display,
    lineHeight: 1.2,
    fontWeight: 800,
    letterSpacing: '-0.03em',
  },
  heading: {
    fontSize: typography.heading,
    lineHeight: 1.3,
    fontWeight: 750,
    letterSpacing: '-0.025em',
  },
  title: {
    fontSize: typography.title,
    lineHeight: 1.4,
    fontWeight: 700,
    letterSpacing: '-0.015em',
  },
  lead: { fontSize: typography.lead, lineHeight: 1.7, fontWeight: 400 },
  body: { fontSize: typography.body, lineHeight: 1.65, fontWeight: 400 },
  label: { fontSize: typography.label, lineHeight: 1.5, fontWeight: 600 },
  small: { fontSize: typography.small, lineHeight: 1.6, fontWeight: 400 },
  caption: { fontSize: typography.caption, lineHeight: 1.5, fontWeight: 500 },
  metric: {
    fontSize: typography.metric,
    lineHeight: 1.25,
    fontWeight: 800,
    fontVariantNumeric: 'tabular-nums' as const,
  },
};
