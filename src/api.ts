import { decrypt } from './crypto';
import { nextPoll } from './polling';
import type { Payload, Pc } from './types';

export class LinkGoneError extends Error {}

export interface Reading {
  payload: Payload;
  /** Wie alt die Werte sind, in Sekunden (Uhr des Servers – die Uhr des Handys zählt nicht). */
  ageSec: number;
  /** In wie vielen Millisekunden die nächsten Werte da sind – dann wieder fragen. */
  nextPollMs: number;
}

/** Holt die neuesten Werte eines PCs von der PerfPulse-Website und entschlüsselt sie. */
export async function fetchReading(pc: Pc, signal?: AbortSignal): Promise<Reading> {
  const res = await fetch(`${pc.server}/api/phone/${encodeURIComponent(pc.id)}`, {
    headers: { 'X-PP-Read-Token': pc.read, 'Cache-Control': 'no-store' },
    signal,
  });
  if (res.status === 403) throw new LinkGoneError('Dieser PC hat die Verbindung beendet oder einen neuen Schlüssel erzeugt.');
  if (!res.ok) throw new Error(`Die Website antwortet mit ${res.status}.`);
  const body = (await res.json()) as { data: string; updatedAt: string; now: string; ageMs?: number; nextInMs?: number };
  const payload = decrypt<Payload>(body.data, pc.id, pc.key);
  const ageSec = typeof body.ageMs === 'number' ? body.ageMs / 1000 : (Date.parse(body.now) - Date.parse(body.updatedAt)) / 1000;
  return { payload, ageSec, nextPollMs: nextPoll(body.ageMs, body.nextInMs) };
}
