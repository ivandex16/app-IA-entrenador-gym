import { LuSmile, LuMeh, LuFrown, LuLaugh, LuAngry } from 'react-icons/lu';

/* Formats seconds as mm:ss, or hh:mm:ss past one hour. */
export function fmtTime(totalSec) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
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
