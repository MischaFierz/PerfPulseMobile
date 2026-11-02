const DEFAULT_POLL_MS = 2500;

/**
 * Kurz nachdem der PC die nächsten Werte schickt (ageMs/nextInMs vom Server) – so sind die Werte auf dem Handy nur
 * so alt wie der Weg durchs Internet. Schaut der PC noch nicht zu (schickt nur alle 5 Minuten) oder fehlen die
 * Angaben (ältere Website), alle 2,5 Sekunden.
 */
export function nextPoll(ageMs: unknown, nextInMs: unknown): number {
  if (typeof ageMs !== 'number' || typeof nextInMs !== 'number' || nextInMs <= 0 || nextInMs > 10000) return DEFAULT_POLL_MS;
  return Math.max(300, Math.min(3000, nextInMs - ageMs + 350));
}
