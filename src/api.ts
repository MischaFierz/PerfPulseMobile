import { decrypt } from './crypto';
import type { Payload, Pc } from './types';

export class LinkGoneError extends Error {}

export interface Reading {
  payload: Payload;
  /** Wie alt die Werte sind, in Sekunden (Uhr des Servers – die Uhr des Handys zählt nicht). */
  ageSec: number;
}

/** Holt die neuesten Werte eines PCs von der PerfPulse-Website und entschlüsselt sie. */
export async function fetchReading(pc: Pc, signal?: AbortSignal): Promise<Reading> {
  const res = await fetch(`${pc.server}/api/phone/${encodeURIComponent(pc.id)}`, {
    headers: { 'X-PP-Read-Token': pc.read, 'Cache-Control': 'no-store' },
    signal,
  });
  if (res.status === 403) throw new LinkGoneError('Dieser PC hat die Verbindung beendet oder einen neuen Schlüssel erzeugt.');
  if (!res.ok) throw new Error(`Die Website antwortet mit ${res.status}.`);
  const body = (await res.json()) as { data: string; updatedAt: string; now: string };
  const payload = decrypt<Payload>(body.data, pc.id, pc.key);
  return { payload, ageSec: (Date.parse(body.now) - Date.parse(body.updatedAt)) / 1000 };
}
