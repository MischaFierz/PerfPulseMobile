import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { ScanScreen } from './src/screens/ScanScreen';
import { loadCurrent, loadPcs, saveCurrent, savePcs } from './src/storage';
import { colors } from './src/theme';
import type { Pc } from './src/types';
import { checkForUpdate, installedVersion, type AppUpdate } from './src/update';

/**
 * PerfPulse fürs Handy: zeigt die Werte deiner PCs live – von überall. Einmal den QR-Code aus PerfPulse scannen
 * (Seite „Handy“ → Handy-Verbindung einschalten), dann bleibt der PC gespeichert. Mehrere PCs gehen auch.
 */
export default function App() {
  const [pcs, setPcs] = useState<Pc[] | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [picker, setPicker] = useState(false);
  const [update, setUpdate] = useState<AppUpdate | null>(null);
  const [updateDismissed, setUpdateDismissed] = useState(false);

  useEffect(() => {
    (async () => {
      const list = await loadPcs();
      const cur = await loadCurrent();
      setPcs(list);
      setCurrentId(list.some(p => p.id === cur) ? cur : list[0]?.id ?? null);
    })();
  }, []);

  const store = useCallback(async (list: Pc[], cur: string | null) => {
    setPcs(list);
    setCurrentId(cur);
    await savePcs(list);
    await saveCurrent(cur);
  }, []);

  const current = pcs?.find(p => p.id === currentId) ?? null;
  const server = current?.server ?? pcs?.[0]?.server;

  // Neue Version der App? Beim Start und wenn die App wieder in den Vordergrund kommt - die Website kennt jeder gespeicherte PC.
  useEffect(() => {
    if (!server) return;
    const check = () => checkForUpdate(server).then(setUpdate);
    check();
    const sub = AppState.addEventListener('change', s => { if (s === 'active') check(); });
    return () => sub.remove();
  }, [server]);

  const onPaired = (pc: Pc) => {
    const list = (pcs ?? []).filter(p => p.id !== pc.id).concat(pc);
    setScanning(false);
    store(list, pc.id);
  };

  const onName = useCallback((name: string) => {
    setPcs(list => {
      if (!list) return list;
      const next = list.map(p => (p.id === currentId ? { ...p, name } : p));
      savePcs(next);
      return next;
    });
  }, [currentId]);

  const remove = (pc: Pc) => {
    Alert.alert('PC entfernen?', `„${pc.name}“ von diesem Handy entfernen? Zum Zurückholen den QR-Code neu scannen.`, [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Entfernen', style: 'destructive', onPress: () => {
          const list = (pcs ?? []).filter(p => p.id !== pc.id);
          store(list, list[0]?.id ?? null);
          setPicker(false);
        },
      },
    ]);
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <View style={styles.logo}><Text style={styles.logoText}>P</Text></View>
          <Text style={styles.title}>PerfPulse</Text>
          {current && (
            <Pressable style={styles.pcButton} onPress={() => setPicker(true)}>
              <Text style={styles.pcButtonText} numberOfLines={1}>{current.name} ▾</Text>
            </Pressable>
          )}
        </View>

        {update && !updateDismissed && (
          <View style={styles.update}>
            <Text style={styles.updateTitle}>Neue Version {update.version}</Text>
            {!!update.note && <Text style={styles.updateNote} numberOfLines={4}>{update.note}</Text>}
            <View style={styles.updateActions}>
              <Pressable style={styles.updateButton} onPress={() => Linking.openURL(update.url)}>
                <Text style={styles.addText}>Herunterladen & installieren</Text>
              </Pressable>
              <Pressable onPress={() => setUpdateDismissed(true)} hitSlop={10}><Text style={styles.sheetSub}>Später</Text></Pressable>
            </View>
          </View>
        )}

        {pcs === null ? (
          <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>
        ) : !current || scanning ? (
          <ScanScreen onPaired={onPaired} onCancel={current ? () => setScanning(false) : undefined} />
        ) : (
          <DashboardScreen key={current.id} pc={current} onName={onName} onGone={() => setScanning(true)} />
        )}

        <Modal visible={picker} transparent animationType="fade" onRequestClose={() => setPicker(false)}>
          <Pressable style={styles.backdrop} onPress={() => setPicker(false)}>
            <Pressable style={styles.sheet}>
              <Text style={styles.sheetTitle}>Deine PCs</Text>
              {pcs?.map(pc => (
                <View key={pc.id} style={styles.sheetRow}>
                  <Pressable style={{ flex: 1 }} onPress={() => { store(pcs, pc.id); setPicker(false); }}>
                    <Text style={[styles.sheetText, pc.id === currentId && { color: colors.accent }]}>{pc.name}</Text>
                    <Text style={styles.sheetSub}>{pc.server.replace(/^https?:\/\//, '')}</Text>
                  </Pressable>
                  <Pressable onPress={() => remove(pc)} hitSlop={10}><Text style={styles.remove}>Entfernen</Text></Pressable>
                </View>
              ))}
              <Pressable style={styles.addButton} onPress={() => { setPicker(false); setScanning(true); }}>
                <Text style={styles.addText}>+ Weiteren PC verbinden</Text>
              </Pressable>
              <Text style={[styles.sheetSub, { textAlign: 'center', marginTop: 14 }]}>PerfPulse {installedVersion()}</Text>
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingTop: 6, paddingBottom: 4 },
  logo: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center' },
  logoText: { color: 'white', fontWeight: '800', fontSize: 16 },
  title: { color: colors.text, fontSize: 18, fontWeight: '700' },
  pcButton: { marginLeft: 'auto', maxWidth: '50%', backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 6 },
  pcButtonText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  backdrop: { flex: 1, backgroundColor: '#000A', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, paddingBottom: 34 },
  sheetTitle: { color: colors.sub, fontSize: 12, fontWeight: '600', letterSpacing: 0.7, marginBottom: 8 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomColor: colors.line, borderBottomWidth: 1 },
  sheetText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  sheetSub: { color: colors.sub, fontSize: 12 },
  remove: { color: colors.crit, fontSize: 13 },
  addButton: { marginTop: 14, backgroundColor: '#1E2333', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  addText: { color: colors.text, fontWeight: '600' },
  update: { marginHorizontal: 14, marginTop: 8, padding: 12, borderRadius: 14, backgroundColor: '#22D3EE1A', borderColor: '#22D3EE55', borderWidth: 1 },
  updateTitle: { color: colors.text, fontWeight: '700', fontSize: 15 },
  updateNote: { color: colors.sub, fontSize: 13, marginTop: 4 },
  updateActions: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 10 },
  updateButton: { backgroundColor: '#1E2333', borderRadius: 10, paddingVertical: 9, paddingHorizontal: 14 },
});
