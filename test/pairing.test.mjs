// Prüft, dass die App die Daten des PCs entschlüsselt – im selben Format, wie PerfPulse (C#, AesGcm) sie schickt.
import assert from 'node:assert/strict';
import { createCipheriv, randomBytes } from 'node:crypto';
import { test } from 'node:test';

const { decrypt, fromBase64 } = await import('../src/crypto.ts');
const { parsePairing, isLanPairing } = await import('../src/pairing.ts');

const b64u = b => b.toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

test('entschlüsselt wie PerfPulse verschlüsselt', () => {
  const key = randomBytes(32), id = b64u(randomBytes(16)), nonce = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key, nonce);
  c.setAAD(Buffer.from(id));
  const data = { stats: { pc: 'BÜRO-PC ✓', cpu: 12.5 }, crashes: null };
  const ct = Buffer.concat([c.update(JSON.stringify(data)), c.final()]);
  const payload = Buffer.concat([nonce, ct, c.getAuthTag()]).toString('base64');
  assert.deepEqual(decrypt(payload, id, b64u(key)), data);
  assert.throws(() => decrypt(payload, 'andere-id', b64u(key)));
});

test('Base64 und Base64url', () => {
  const bytes = randomBytes(33);
  assert.deepEqual(Buffer.from(fromBase64(bytes.toString('base64'))), bytes);
  assert.deepEqual(Buffer.from(fromBase64(b64u(bytes))), bytes);
});

test('liest den QR-Code von PerfPulse', () => {
  const i = 'AbCdEfGhIjKlMnOpQrStUv', r = 'r'.repeat(43), e = 'e'.repeat(43);
  assert.deepEqual(parsePairing(`https://perfpulse.ch/handy#i=${i}&r=${r}&e=${e}`),
    { server: 'https://perfpulse.ch', id: i, read: r, key: e, name: 'PC' });
  assert.equal(parsePairing(`https://x.ch/unterordner/handy#i=${i}&r=${r}&e=${e}`)?.server, 'https://x.ch/unterordner');
  assert.equal(parsePairing('https://perfpulse.ch/handy#i=kurz'), null);
  assert.equal(parsePairing('hallo'), null);
  assert.ok(isLanPairing('http://192.168.1.20:8765/#k=abc'));
});
