import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** Die neueste Handy-App auf der PerfPulse-Website (Admin-Bereich → Handy-App → Veröffentlichen). */
export interface AppUpdate {
  version: string;
  versionCode: number;
  note: string;
  url: string;
  size: number;
}

/** Der versionCode dieser App - setzt der Workflow „App veröffentlichen“ in app.json. */
export const installedVersionCode = (): number => Constants.expoConfig?.android?.versionCode ?? 0;
export const installedVersion = (): string => Constants.expoConfig?.version ?? '';

/**
 * Gibt es auf der Website eine neuere App? Nur auf Android - aufs iPhone kommt die App nicht als Datei.
 * Fehler zählen nicht: Dann eben beim nächsten Start.
 */
export async function checkForUpdate(server: string): Promise<AppUpdate | null> {
  if (Platform.OS !== 'android') return null;
  try {
    const res = await fetch(`${server}/api/mobile-app`, { headers: { 'Cache-Control': 'no-store' } });
    if (!res.ok) return null;
    const latest = (await res.json()) as AppUpdate;
    return typeof latest.versionCode === 'number' && latest.versionCode > installedVersionCode() ? latest : null;
  } catch {
    return null;
  }
}
