export const colors = {
  bgDeep: '#000000',
  bgPrimary: '#000000',
  bgCard: 'rgba(255,200,50,0.025)',
  bgCardHover: 'rgba(255,200,50,0.04)',
  border: 'rgba(255,200,50,0.10)',
  borderBright: 'rgba(255,200,50,0.18)',
  textPrimary: '#ffc832',
  textSecondary: '#c8a020',
  textMuted: '#7a6418',
  accent: '#ffc832',
  critical: '#ff3b3b',
  high: '#ff8c00',
  medium: '#d4a72c',
  low: '#ffc832',
  positive: '#00ff88',
  purple: '#a855f7',
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
