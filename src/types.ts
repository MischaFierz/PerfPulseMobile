/** Ein PC auf diesem Handy – aus dem QR-Code in PerfPulse (Seite „Handy“ → „Überall“). */
export interface Pc {
  /** Die PerfPulse-Website, etwa https://perfpulse.ch */
  server: string;
  /** Die Verbindung (22 Zeichen). */
  id: string;
  /** Der Schlüssel zum Lesen. */
  read: string;
  /** Der Schlüssel zum Entschlüsseln (AES-256). */
  key: string;
  /** Der Name des PCs, sobald die ersten Werte da sind. */
  name: string;
}

export interface Temp { label: string; c: number; est: boolean; level: string; throttling: boolean }
export interface Proc { name: string; cpu: number; ram: number; gpu: number }

/** Was PerfPulse schickt (wie /api/stats der Verbindung im Heimnetz). */
export interface Stats {
  pc: string;
  ready: boolean;
  version?: string;
  uptimeSec?: number;
  cpu: number;
  cpuMhz: number | null;
  ramUsed: number;
  ramTotal: number;
  ramPct: number;
  gpu: number | null;
  /** Bilder pro Sekunde des Spiels im Vordergrund – fehlt bei älteren PerfPulse-Fassungen. */
  fps?: number | null;
  fpsApp?: string | null;
  diskActive: number | null;
  diskRead: number | null;
  diskWrite: number | null;
  netDown: number | null;
  netUp: number | null;
  processCount: number;
  temps: Temp[];
  procs: Proc[];
  history: { cpu: number[]; ram: number[]; gpu: number[] };
  crashes: null | { days: number; bluescreen: number; shutdown: number; app: number; hang: number; gpu: number; perfpulse: number };
}

export interface Crashes {
  ready: boolean;
  days?: number;
  hints?: { severity: string; title: string; text: string }[];
  events?: { time: string; kind: string; kindText: string; program: string | null; title: string; detail: string | null }[];
}

/** crashes fehlt (null), wenn sich die Liste seit der letzten Sendung nicht geändert hat. */
export interface Payload { stats: Stats; crashes: Crashes | null }
