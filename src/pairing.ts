import type { Pc } from './types';

const TOKEN = /^[A-Za-z0-9_-]{16,64}$/;

/**
 * Liest den QR-Code von PerfPulse: https://<website>/handy#i=<id>&r=<lesen>&e=<schlüssel>.
 * null, wenn es kein solcher Code ist.
 */
export function parsePairing(text: string): Pc | null {
  const m = text.trim().match(/^(https?:\/\/[^#?\s]+?)\/handy\/?#(.+)$/i);
  if (!m) return null;
  const params: Record<string, string> = {};
  for (const part of m[2].split('&')) {
    const [k, v] = part.split('=');
    if (k && v) params[k] = decodeURIComponent(v);
  }
  if (![params.i, params.r, params.e].every(v => v && TOKEN.test(v))) return null;
  return { server: m[1], id: params.i, read: params.r, key: params.e, name: 'PC' };
}
