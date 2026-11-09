/*
 * Pure helpers for the workout history (no React): grouping by local month and
 * day, per-session metrics, monthly summary and weekly streak.
 * All dates go through workoutDisplayDate so old records stored as UTC
 * midnight keep their calendar day.
 */
import { workoutDisplayDate } from './workoutUtils';

const pad2 = (n) => String(n).padStart(2, '0');

/* "2026-11" for the local month of a date */
export const monthKeyOf = (date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
/* "2026-11-09" for the local day of a date */
export const dayKeyOf = (date) => `${monthKeyOf(date)}-${pad2(date.getDate())}`;

export function parseMonthKey(key) {
  const [y, m] = key.split('-').map(Number);
  return { year: y, month: m - 1 };
}

export function shiftMonth(key, delta) {
  const { year, month } = parseMonthKey(key);
  return monthKeyOf(new Date(year, month + delta, 1));
}

export function monthLabel(key) {
  const { year, month } = parseMonthKey(key);
  const label = new Date(year, month, 1).toLocaleDateString('es', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/* Monday (local) of the week a date falls in, as a day key. */
export function weekKeyOf(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - offset);
  return dayKeyOf(d);
}

/* ── Per-session metrics ── */
const num = (v) => Number(v) || 0;
const setsOf = (log) => (log.exercises || []).flatMap((e) => e.sets || []);

export const totalSets = (log) => setsOf(log).length;
export const totalVolume = (log) => setsOf(log).reduce((sum, s) => sum + num(s.weight) * num(s.reps), 0);
export const maxWeight = (log) => setsOf(log).reduce((m, s) => Math.max(m, num(s.weight)), 0);

/* Short, human title: the routine name if it came from one, else the first exercises. */
export function sessionTitle(log) {
  const fromRoutine = /^Rutina:\s*(.+)$/m.exec(log.notes || '');
  if (fromRoutine) return fromRoutine[1].trim();
  const names = (log.exercises || []).map((e) => e.exercise?.name).filter(Boolean);
  if (names.length === 0) return 'Entrenamiento';
  return names.length <= 2 ? names.join(' + ') : `${names.slice(0, 2).join(' + ')} +${names.length - 2}`;
}

/* ── Grouping ── */
/* Adds the local date and keys to each log once, newest first. */
export function indexLogs(logs) {
  return (logs || [])
    .map((log) => {
      const date = workoutDisplayDate(log.date);
      return { log, date, dayKey: dayKeyOf(date), monthKey: monthKeyOf(date), weekKey: weekKeyOf(date) };
    })
    .sort((a, b) => b.date - a.date);
}

/* Month summary for the given indexed entries of that month. */
export function summarizeMonth(entries) {
  return entries.reduce(
    (acc, { log, dayKey }) => {
      acc.sessions += 1;
      acc.minutes += num(log.durationMinutes);
      acc.volume += totalVolume(log);
      acc.days.add(dayKey);
      return acc;
    },
    { sessions: 0, minutes: 0, volume: 0, days: new Set() }
  );
}

/* Consecutive weeks (Mon–Sun) with at least one session, ending this week.
   The current week doesn't break the streak until it's over. */
export function weeklyStreak(entries, today = new Date()) {
  const weeks = new Set(entries.map((e) => e.weekKey));
  let cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!weeks.has(weekKeyOf(cursor))) cursor.setDate(cursor.getDate() - 7);
  let streak = 0;
  while (weeks.has(weekKeyOf(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}

/* Calendar cells for a month: leading blanks (Monday-first) + one per day. */
export function monthGrid(key) {
  const { year, month } = parseMonthKey(key);
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const blanks = (first.getDay() + 6) % 7;
  const cells = Array.from({ length: blanks }, () => null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  return cells;
}

export const formatKg = (kg) => `${Math.round(kg).toLocaleString('es')} kg`;

export function formatMinutes(min) {
  const m = Math.round(min);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h} h ${rest} min` : `${h} h`;
}
