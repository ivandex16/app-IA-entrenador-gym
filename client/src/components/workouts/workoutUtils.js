import { LuSmile, LuMeh, LuFrown, LuLaugh, LuAngry } from 'react-icons/lu';

/* Formats seconds as mm:ss (hh:mm:ss past one hour, or always with `withHours`). */
export function fmtTime(totalSec, withHours = false) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 || withHours ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/* Short label for a rest duration: 45s, 1m 30s, 3m. */
export function fmtPreset(sec) {
  if (sec >= 60 && sec % 60 === 0) return `${sec / 60}m`;
  if (sec >= 60) return `${Math.floor(sec / 60)}m ${sec % 60}s`;
  return `${sec}s`;
}

/* Seconds elapsed since a Date.now() timestamp (0 if there is none). */
export function secondsSince(startTime) {
  if (!startTime) return 0;
  return Math.max(0, Math.floor((Date.now() - startTime) / 1000));
}

export const FEELINGS = [
  { v: 'great', l: 'Genial', Icon: LuLaugh },
  { v: 'good', l: 'Bien', Icon: LuSmile },
  { v: 'ok', l: 'Normal', Icon: LuMeh },
  { v: 'tired', l: 'Cansado', Icon: LuFrown },
  { v: 'bad', l: 'Mal', Icon: LuAngry },
];
