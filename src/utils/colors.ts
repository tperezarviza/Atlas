export const colors = {
  bgDeep: '#030810',
  bgPrimary: '#070d1a',
  bgCard: '#0b1224',
  bgCardHover: '#101a32',
  border: '#14233f',
  borderBright: '#1c3260',
  textPrimary: '#d8e2f0',
  textSecondary: '#7a8ba8',
  textMuted: '#3d506e',
  accent: '#2d7aed',
  critical: '#e83b3b',
  high: '#e8842b',
  medium: '#d4a72c',
  low: '#2d7aed',
  positive: '#28b35a',
  purple: '#9b59e8',
  cyan: '#1abcdb',
} as const;

export const severityColors: Record<string, string> = {
  critical: colors.critical,
  high: colors.high,
  medium: colors.medium,
  low: colors.low,
};

export const connectionColors: Record<string, string> = {
  proxy_war: colors.critical,
  arms_flow: colors.high,
  alliance: colors.accent,
  spillover: colors.medium,
  military: colors.purple,
  cyber: colors.purple,
};

export const connectionDash: Record<string, string | undefined> = {
  proxy_war: undefined,
  arms_flow: '8 6',
  alliance: undefined,
  spillover: '4 4',
  military: '8 4',
  cyber: '6 4',
};

export const bulletColors: Record<string, string> = {
  critical: colors.critical,
  high: colors.high,
  medium: colors.medium,
  accent: colors.accent,
};
