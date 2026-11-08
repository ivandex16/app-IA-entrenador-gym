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

/* ── Dates ──
   The date picker works with local calendar days ("YYYY-MM-DD"). Sending that
   string as-is makes the server store UTC midnight, which in Colombia (UTC-5)
   is 7 pm of the previous day. So:
   - the default value is today's *local* date (toISOString() would give the UTC
     day, i.e. tomorrow after 7 pm);
   - on save the day becomes a real instant: now if it's today, otherwise local
     noon of that day (safe from day shifts in any time zone);
   - on display, old records stored as UTC midnight keep their calendar day. */
const pad2 = (n) => String(n).padStart(2, '0');
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function todayLocalISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function localDayToInstant(day) {
  const m = DATE_ONLY.exec(day || '');
  if (!m) return day; // already a full timestamp (or empty): leave it alone
  if (day === todayLocalISO()) return new Date().toISOString();
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12).toISOString();
}

export function workoutDisplayDate(value) {
  const d = new Date(value);
  const legacyDateOnly =
    d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0;
  return legacyDateOnly ? new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) : d;
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
