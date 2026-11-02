import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { fetchReading, LinkGoneError, type Reading } from '../api';
import { Card } from '../components/Card';
import { Chart } from '../components/Chart';
import { Gauge } from '../components/Gauge';
import { ago, bytes, rate, uptime } from '../format';
import { colors, levelColor } from '../theme';
import type { Crashes, Pc } from '../types';

const LIVE_MS = 2500;

/** Die Werte eines PCs, live, solange die App offen ist. */
export function DashboardScreen({ pc, onName, onGone }: { pc: Pc; onName: (name: string) => void; onGone: () => void }) {
  const [reading, setReading] = useState<Reading | null>(null);
  // Die Absturzliste schickt der PC nur, wenn sie neu ist – sonst gilt die letzte.
  const [crashes, setCrashes] = useState<Crashes | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gone, setGone] = useState(false);
  const [showCrashes, setShowCrashes] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = useRef(AppState.currentState === 'active');

  const tick = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    try {
      const r = await fetchReading(pc);
      setReading(r);
      if (r.payload.crashes) setCrashes(r.payload.crashes);
      setError(null);
      setGone(false);
      if (r.payload.stats.pc && r.payload.stats.pc !== pc.name) onName(r.payload.stats.pc);
    } catch (e) {
      if (e instanceof LinkGoneError) setGone(true);
      else setError(e instanceof Error && e.message.startsWith('Die Website') ? e.message : 'Keine Verbindung zur PerfPulse-Website.');
    }
    // Im Hintergrund nicht fragen – spart Akku und Daten.
    if (active.current) timer.current = setTimeout(tick, LIVE_MS);
  }, [pc, onName]);

  useEffect(() => {
    setReading(null);
    tick();
    const sub = AppState.addEventListener('change', s => {
      active.current = s === 'active';
      if (active.current) tick();
      else if (timer.current) clearTimeout(timer.current);
    });
    return () => { sub.remove(); if (timer.current) clearTimeout(timer.current); };
  }, [tick]);

  if (gone) {
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 42 }}>🔒</Text>
        <Text style={styles.h2}>Verbindung beendet</Text>
        <Text style={styles.centerText}>„{pc.name}“ hat „Von überall“ ausgeschaltet oder einen neuen Schlüssel erzeugt. Scanne den QR-Code in PerfPulse neu.</Text>
        <Pressable style={styles.button} onPress={onGone}><Text style={styles.buttonText}>Neu scannen</Text></Pressable>
      </View>
    );
  }
  if (!reading) {
    return (
      <View style={styles.center}>
        {error ? <Text style={styles.centerText}>{error}</Text> : <ActivityIndicator color={colors.accent} />}
      </View>
    );
  }

  const s = reading.payload.stats;
  // Ohne Zuschauer schickt der PC nur alle 5 Minuten; erst danach gilt er als weg.
  const stale = reading.ageSec > 400;
  const status = error ? 'Kein Internet' : stale ? 'Offline' : reading.ageSec > 15 ? 'Verbinde …' : 'Live';
  const live = status === 'Live';

  return (
    <ScrollView contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.accent}
        onRefresh={async () => { setRefreshing(true); await tick(); setRefreshing(false); }} />}>
      <View style={styles.statusRow}>
        <Text style={styles.pcName} numberOfLines={1}>{s.pc}</Text>
        <View style={[styles.pill, !live && styles.pillOff]}>
          <View style={[styles.dot, { backgroundColor: live ? colors.good : colors.crit }]} />
          <Text style={{ color: live ? colors.good : colors.crit, fontSize: 12, fontWeight: '600' }}>{status}</Text>
        </View>
      </View>

      {stale && (
        <View style={styles.stale}>
          <Text style={styles.staleText}>
            Der PC hat sich seit {ago(reading.ageSec)} nicht mehr gemeldet – er ist wohl aus, im Ruhezustand oder PerfPulse läuft nicht. Das sind die letzten Werte.
          </Text>
        </View>
      )}

      {s.ready ? (
        <>
          <View style={styles.grid}>
            <Gauge label="CPU" value={s.cpu} sub={s.cpuMhz ? `${(s.cpuMhz / 1000).toFixed(2)} GHz` : ''} color={colors.accent} />
            <Gauge label="RAM" value={s.ramPct} sub={`${bytes(s.ramUsed)} / ${bytes(s.ramTotal)}`} color={colors.accent2} />
          </View>
          <View style={styles.grid}>
            <Gauge label="GPU" value={s.gpu} sub={s.gpu == null ? 'nicht verfügbar' : ''} color={colors.good} />
            <Gauge label="Datenträger" value={s.diskActive} sub="Aktivität" color={colors.info} />
          </View>

          <Card title="Verlauf" right="2 Minuten">
            <Chart {...s.history} />
            <View style={styles.legend}>
              {[['CPU', colors.accent], ['RAM', colors.accent2], ['GPU', colors.good]].map(([l, c]) => (
                <View key={l} style={styles.legendItem}><View style={[styles.legendLine, { backgroundColor: c }]} /><Text style={styles.sub}>{l}</Text></View>
              ))}
            </View>
          </Card>

          <Card title="Netzwerk & Datenträger">
            <View style={styles.grid}>
              <Io label="↓ Download" value={rate(s.netDown)} />
              <Io label="↑ Upload" value={rate(s.netUp)} />
            </View>
            <View style={[styles.grid, { marginBottom: 0 }]}>
              <Io label="Lesen" value={rate(s.diskRead)} />
              <Io label="Schreiben" value={rate(s.diskWrite)} />
            </View>
          </Card>

          {s.temps.length > 0 && (
            <Card title="Temperaturen">
              {s.temps.map(t => (
                <View key={t.label} style={styles.row}>
                  <Text style={styles.rowName} numberOfLines={1}>{t.label}{t.throttling ? <Text style={{ color: colors.crit }}> · drosselt</Text> : null}</Text>
                  <Text style={[styles.rowNum, { color: levelColor[t.level] ?? colors.text }]}>{t.est ? '≈ ' : ''}{t.c} °C</Text>
                </View>
              ))}
            </Card>
          )}

          <Card title="Aktivste Prozesse" right={`${s.processCount} laufend`}>
            {s.procs.map((p, i) => (
              <View key={`${p.name}-${i}`} style={{ marginBottom: 8 }}>
                <View style={styles.row}>
                  <Text style={styles.rowName} numberOfLines={1}>{p.name}</Text>
                  <Text style={styles.rowNum}>{p.cpu.toFixed(1)} %</Text>
                  <Text style={[styles.sub, { width: 64, textAlign: 'right' }]}>{bytes(p.ram)}</Text>
                </View>
                <View style={styles.meter}><View style={[styles.meterFill, { width: `${Math.min(100, p.cpu)}%` }]} /></View>
              </View>
            ))}
          </Card>

          {s.crashes && (
            <Card title="Abstürze" right={`letzte ${s.crashes.days} Tage`}>
              <View style={styles.chips}>
                <Chip n={s.crashes.bluescreen} label="Bluescreens" bad />
                <Chip n={s.crashes.shutdown} label="Unerwartet aus" bad />
                <Chip n={s.crashes.gpu} label="Grafik-Resets" />
                <Chip n={s.crashes.app} label="App-Abstürze" />
                <Chip n={s.crashes.hang} label="Hänger" />
                <Chip n={s.crashes.perfpulse} label="PerfPulse" />
              </View>
              {showCrashes && <CrashList c={crashes} />}
              <Pressable style={styles.button} onPress={() => setShowCrashes(v => !v)}>
                <Text style={styles.buttonText}>{showCrashes ? 'Details ausblenden' : 'Details anzeigen'}</Text>
              </Pressable>
            </Card>
          )}

          <Text style={styles.footer}>Läuft seit {uptime(s.uptimeSec ?? 0)} · PerfPulse {s.version}</Text>
        </>
      ) : (
        <Text style={styles.centerText}>PerfPulse startet gerade …</Text>
      )}
    </ScrollView>
  );
}

function Io({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.io}>
      <Text style={styles.sub}>{label}</Text>
      <Text style={styles.ioValue}>{value}</Text>
    </View>
  );
}

function Chip({ n, label, bad }: { n: number; label: string; bad?: boolean }) {
  const color = n === 0 ? colors.good : bad ? colors.crit : colors.warn;
  return (
    <View style={styles.chip}>
      <Text style={{ color, fontSize: 20, fontWeight: '700' }}>{n}</Text>
      <Text style={[styles.sub, { fontSize: 11 }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const KIND: Record<string, string> = {
  bluescreen: colors.crit, unexpectedshutdown: colors.crit, gpureset: colors.warn, appcrash: colors.warn, apphang: colors.info, perfpulse: colors.warn,
};

function CrashList({ c }: { c: Crashes | null }) {
  if (!c?.ready) return <Text style={[styles.sub, { marginTop: 12 }]}>Noch nicht geladen – gleich nochmal versuchen.</Text>;
  return (
    <View style={{ marginTop: 12 }}>
      {c.hints?.map(h => (
        <View key={h.title} style={[styles.hint, { borderColor: h.severity === 'critical' ? colors.crit : h.severity === 'ok' ? colors.good : colors.warn }]}>
          <Text style={{ color: colors.text, fontWeight: '700' }}>{h.title}</Text>
          <Text style={{ color: colors.text, fontSize: 13 }}>{h.text}</Text>
        </View>
      ))}
      {c.events?.map((e, i) => (
        <View key={`${e.time}-${i}`} style={styles.event}>
          <Text style={[styles.sub, { fontSize: 12 }]}>{new Date(e.time).toLocaleString('de-CH')}</Text>
          <Text style={{ color: colors.text }}>
            <Text style={{ color: KIND[e.kind] ?? colors.warn, fontWeight: '700', fontSize: 12 }}>{e.kindText}  </Text>{e.title}
          </Text>
          {!!e.detail && <Text style={[styles.sub, { fontSize: 13 }]}>{e.detail}</Text>}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 14, paddingBottom: 30 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  centerText: { color: colors.sub, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  h2: { color: colors.text, fontSize: 20, fontWeight: '700', marginTop: 10 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  pcName: { flex: 1, color: colors.sub, fontSize: 13 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, backgroundColor: '#22C55E1A' },
  pillOff: { backgroundColor: '#EF44441A' },
  dot: { width: 7, height: 7, borderRadius: 4 },
  stale: { backgroundColor: '#F59E0B1A', borderColor: '#F59E0B40', borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 12 },
  staleText: { color: '#FCD34D', fontSize: 13 },
  grid: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  legend: { flexDirection: 'row', gap: 14, marginTop: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendLine: { width: 10, height: 3, borderRadius: 2 },
  sub: { color: colors.sub, fontSize: 12 },
  io: { flex: 1, backgroundColor: colors.inner, borderRadius: 12, padding: 10 },
  ioValue: { color: colors.text, fontSize: 17, fontWeight: '700', marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  rowName: { flex: 1, color: colors.text, fontSize: 14 },
  rowNum: { color: colors.text, fontWeight: '600', fontSize: 13 },
  meter: { height: 4, borderRadius: 2, backgroundColor: colors.line, overflow: 'hidden' },
  meterFill: { height: '100%', backgroundColor: colors.accent },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { width: '31%', flexGrow: 1, backgroundColor: colors.inner, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 10 },
  button: { marginTop: 10, backgroundColor: '#1E2333', borderColor: colors.line, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  buttonText: { color: colors.text, fontWeight: '600' },
  hint: { borderLeftWidth: 3, paddingLeft: 10, paddingVertical: 4, marginBottom: 10 },
  event: { borderTopColor: colors.line, borderTopWidth: 1, paddingVertical: 9 },
  footer: { color: colors.sub, fontSize: 12, textAlign: 'center', marginTop: 6 },
});
