export const bytes = (b: number | null | undefined): string => {
  if (b == null) return '–';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (b >= 1024 && i < u.length - 1) { b /= 1024; i++; }
  return (i ? b.toFixed(1) : b.toFixed(0)) + ' ' + u[i];
};

export const rate = (b: number | null | undefined) => (b == null ? '–' : bytes(b) + '/s');

export const uptime = (sec: number) => {
  const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60);
  return d ? `${d} T ${h} h` : h ? `${h} h ${m} min` : `${m} min`;
};

export const ago = (sec: number) =>
  sec < 90 ? `${Math.round(sec)} s` : sec < 5400 ? `${Math.round(sec / 60)} min` : sec < 172800 ? `${Math.round(sec / 3600)} h` : `${Math.round(sec / 86400)} Tagen`;
