import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

export function Card({ title, right, children }: { title: string; right?: string; children: ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.title}>{title.toUpperCase()}</Text>
        {!!right && <Text style={styles.title}>{right.toUpperCase()}</Text>}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 12 },
  head: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  title: { color: colors.sub, fontSize: 12, fontWeight: '600', letterSpacing: 0.7 },
});
