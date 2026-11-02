import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, loadColor } from '../theme';

export function Gauge({ label, value, sub, color }: { label: string; value: number | null; sub?: string; color: string }) {
  const r = 26, c = 2 * Math.PI * r;
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <View style={styles.gauge}>
      <Svg width={54} height={54} viewBox="0 0 62 62" style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={31} cy={31} r={r} fill="none" stroke={colors.line} strokeWidth={7} />
        <Circle cx={31} cy={31} r={r} fill="none" stroke={loadColor(pct, color)} strokeWidth={7} strokeLinecap="round"
          strokeDasharray={`${c} ${c}`} strokeDashoffset={c * (1 - pct / 100)} />
      </Svg>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value == null ? '–' : `${Math.round(value)} %`}</Text>
        {!!sub && <Text style={styles.sub} numberOfLines={1}>{sub}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  gauge: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12,
    backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderRadius: 16,
  },
  label: { color: colors.sub, fontSize: 12 },
  value: { color: colors.text, fontSize: 22, fontWeight: '700' },
  sub: { color: colors.sub, fontSize: 11 },
});
