import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { isLanPairing, parsePairing } from '../pairing';
import { colors } from '../theme';
import type { Pc } from '../types';

/** QR-Code aus PerfPulse scannen (Seite „Handy“ → „Überall“) – oder den kopierten Link einfügen. */
export function ScanScreen({ onPaired, onCancel }: { onPaired: (pc: Pc) => void; onCancel?: () => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState('');
  const done = useRef(false);

  const handle = (text: string) => {
    if (done.current) return;
    const pc = parsePairing(text);
    if (pc) { done.current = true; onPaired(pc); return; }
    setError(isLanPairing(text)
      ? 'Das ist der QR-Code für das Heimnetz. Wähle in PerfPulse beim QR-Code „Überall“.'
      : 'Das ist kein QR-Code von PerfPulse.');
  };

  return (
    <View style={styles.root}>
      <Text style={styles.h1}>PC verbinden</Text>
      <Text style={styles.p}>
        Öffne PerfPulse am PC, gehe auf <Text style={styles.b}>Handy</Text>, schalte <Text style={styles.b}>Von überall</Text> ein
        und scanne den QR-Code. Danach bleibt das Handy verbunden – überall, auch im Mobilnetz.
      </Text>

      <View style={styles.camera}>
        {permission?.granted ? (
          <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={r => handle(r.data)} />
        ) : (
          <Pressable style={styles.button} onPress={requestPermission}>
            <Text style={styles.buttonText}>Kamera erlauben</Text>
          </Pressable>
        )}
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <Text style={[styles.p, { marginTop: 18 }]}>Oder den Link einfügen („Link kopieren“ in PerfPulse):</Text>
      <TextInput style={styles.input} value={manual} onChangeText={setManual} placeholder="https://…/handy#i=…"
        placeholderTextColor={colors.sub} autoCapitalize="none" autoCorrect={false} />
      <Pressable style={styles.button} onPress={() => handle(manual)}><Text style={styles.buttonText}>Verbinden</Text></Pressable>
      {onCancel && <Pressable onPress={onCancel}><Text style={styles.link}>Abbrechen</Text></Pressable>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16 },
  h1: { color: colors.text, fontSize: 24, fontWeight: '700', marginBottom: 8 },
  p: { color: colors.sub, fontSize: 14, lineHeight: 20 },
  b: { color: colors.text, fontWeight: '700' },
  camera: {
    marginTop: 16, aspectRatio: 1, borderRadius: 20, overflow: 'hidden', backgroundColor: colors.card,
    borderColor: colors.line, borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  error: { color: colors.warn, marginTop: 12, fontSize: 14 },
  input: {
    marginTop: 8, color: colors.text, backgroundColor: colors.inner, borderColor: colors.line, borderWidth: 1,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
  },
  button: { marginTop: 10, backgroundColor: '#1E2333', borderColor: colors.line, borderWidth: 1, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 16, alignItems: 'center' },
  buttonText: { color: colors.text, fontWeight: '600' },
  link: { color: colors.sub, textAlign: 'center', marginTop: 14, textDecorationLine: 'underline' },
});
