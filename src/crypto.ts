import { gcm } from '@noble/ciphers/aes.js';
import { unzlibSync } from 'fflate';

/**
 * Die Werte kommen vom PC verschlüsselt über die PerfPulse-Website: Base64 von Nonce (12 Bytes) ‖ Geheimtext ‖ Tag (16 Bytes),
 * AES-256-GCM, die Verbindungs-ID als Zusatzdaten. Der Schlüssel steht nur im QR-Code – der Server kann nichts lesen.
 * Vor dem Verschlüsseln packt der PC die Werte (zlib, beginnt mit 0x78) – ältere Fassungen schicken JSON ({ = 0x7B).
 * Reines JavaScript (noble, fflate), damit es ohne WebCrypto auf jedem Handy läuft.
 */
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const LOOKUP = new Uint8Array(128).fill(255);
for (let i = 0; i < ALPHABET.length; i++) LOOKUP[ALPHABET.charCodeAt(i)] = i;

/** Base64 und Base64url, mit oder ohne „=“. */
export function fromBase64(input: string): Uint8Array {
  const s = input.replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
  const out = new Uint8Array(Math.floor((s.length * 3) / 4));
  let buffer = 0, bits = 0, o = 0;
  for (let i = 0; i < s.length; i++) {
    const v = LOOKUP[s.charCodeAt(i)];
    if (v === undefined || v === 255) throw new Error('Kein Base64');
    buffer = (buffer << 6) | v;
    bits += 6;
    if (bits >= 8) { bits -= 8; out[o++] = (buffer >> bits) & 0xff; }
  }
  return out.subarray(0, o);
}

export function utf8Encode(s: string): Uint8Array {
  const out: number[] = [];
  for (const ch of s) {
    let c = ch.codePointAt(0)!;
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return Uint8Array.from(out);
}

export function utf8Decode(b: Uint8Array): string {
  let s = '';
  for (let i = 0; i < b.length;) {
    const c = b[i++];
    let cp: number;
    if (c < 0x80) cp = c;
    else if (c < 0xe0) cp = ((c & 31) << 6) | (b[i++] & 63);
    else if (c < 0xf0) cp = ((c & 15) << 12) | ((b[i++] & 63) << 6) | (b[i++] & 63);
    else cp = ((c & 7) << 18) | ((b[i++] & 63) << 12) | ((b[i++] & 63) << 6) | (b[i++] & 63);
    s += String.fromCodePoint(cp);
  }
  return s;
}

export function decrypt<T>(data: string, id: string, key: string): T {
  const raw = fromBase64(data);
  if (raw.length < 28) throw new Error('Zu kurz');
  let plain: Uint8Array = gcm(fromBase64(key), raw.subarray(0, 12), utf8Encode(id)).decrypt(raw.subarray(12));
  if (plain[0] === 0x78) plain = unzlibSync(plain);
  return JSON.parse(utf8Decode(plain)) as T;
}
