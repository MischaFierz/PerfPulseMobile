export const colors = {
  bg: '#0E1016', card: '#171B27', inner: '#131722', line: '#252B3D', text: '#E7EAF3', sub: '#8C94AA',
  accent: '#22D3EE', accent2: '#A78BFA', good: '#22C55E', warn: '#F59E0B', crit: '#EF4444', info: '#60A5FA',
};

export const levelColor: Record<string, string> = {
  cool: colors.info, normal: colors.good, warm: colors.warn, hot: colors.crit, critical: colors.crit,
};

export const loadColor = (v: number, fallback: string) => (v >= 90 ? colors.crit : v >= 70 ? colors.warn : fallback);
