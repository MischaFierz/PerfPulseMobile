import * as SecureStore from 'expo-secure-store';
import type { Pc } from './types';

// Die Schlüssel gehören in den sicheren Speicher des Handys (Keychain / Keystore), nicht in eine offene Datei.
const KEY = 'perfpulse.pcs';
const CURRENT = 'perfpulse.current';

export async function loadPcs(): Promise<Pc[]> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    return raw ? (JSON.parse(raw) as Pc[]) : [];
  } catch {
    return [];
  }
}

export async function savePcs(pcs: Pc[]): Promise<void> {
  await SecureStore.setItemAsync(KEY, JSON.stringify(pcs));
}

export async function loadCurrent(): Promise<string | null> {
  try { return await SecureStore.getItemAsync(CURRENT); } catch { return null; }
}

export async function saveCurrent(id: string | null): Promise<void> {
  if (id) await SecureStore.setItemAsync(CURRENT, id);
  else await SecureStore.deleteItemAsync(CURRENT);
}
