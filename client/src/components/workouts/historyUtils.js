/*
 * Pure helpers for the workout history (no React): grouping by local month and
 * day, per-session metrics, monthly summary and weekly streak.
 * All dates go through workoutDisplayDate so old records stored as UTC
 * midnight keep their calendar day.
 */
import { workoutDisplayDate } from './workoutUtils';
import { statusOf } from './workoutStatus';

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

/* Same streak from the server's list of week keys (Mondays with a finished session). */
export function weeklyStreakFromWeeks(weekKeys, today = new Date()) {
  const weeks = new Set(weekKeys || []);
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!weeks.has(weekKeyOf(cursor))) cursor.setDate(cursor.getDate() - 7);
  let streak = 0;
  while (weeks.has(weekKeyOf(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}

/* Exercises not finished in an unfinished session: { name, done, total } (only
   when the session tracked per-set completion). */
export function pendingExercises(log) {
  return (log.exercises || [])
    .map((e) => {
      const sets = e.sets || [];
      if (!sets.some((s) => typeof s.completed === 'boolean')) return null;
      const done = sets.filter((s) => s.completed).length;
      return done < sets.length ? { name: e.exercise?.name || 'Ejercicio', done, total: sets.length } : null;
    })
    .filter(Boolean);
}

/* Rest of an exercise: planned (exercise.restSeconds) and what was actually taken per set. */
export function restInfo(exercise) {
  const actual = (exercise.sets || []).map((s) => (Number.isFinite(s.restSeconds) ? s.restSeconds : null));
  return { planned: Number.isFinite(exercise.restSeconds) ? exercise.restSeconds : null, actual };
}

export function formatRest(sec) {
  if (sec == null) return '';
  const s = Math.round(sec);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m}:${String(r).padStart(2, '0')} min` : `${m} min`;
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

/* ── Muscle groups & type ── */
export const MUSCLE_LABELS = {
  chest: 'Pecho', back: 'Espalda', shoulders: 'Hombros', biceps: 'Bíceps', triceps: 'Tríceps',
  legs: 'Piernas', glutes: 'Glúteos', abs: 'Abdomen', forearms: 'Antebrazos', calves: 'Gemelos',
  full_body: 'Cuerpo completo', cardio: 'Cardio',
};

/* Distinct muscle groups of a session, most worked first (by number of sets). */
export function muscleGroupsOf(log) {
  const counts = new Map();
  for (const e of log.exercises || []) {
    const g = e.exercise?.muscleGroup;
    if (g) counts.set(g, (counts.get(g) || 0) + Math.max(1, (e.sets || []).length));
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([g]) => g);
}

/* 'routine' when the session came from a saved routine, otherwise 'free'. */
export const sessionType = (log) => (/^Rutina:/m.test(log.notes || '') ? 'routine' : 'free');

/* ── Search, filters and sorting ── */
const normalize = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/* Every word of the query must appear in the title, notes, exercises or muscle groups. */
export function matchesQuery(log, query) {
  const q = normalize(query).trim();
  if (!q) return true;
  const haystack = [
    sessionTitle(log),
    log.notes,
    ...(log.exercises || []).map((e) => e.exercise?.name),
    ...muscleGroupsOf(log).map((g) => MUSCLE_LABELS[g] || g),
  ].map(normalize).join(' | ');
  return q.split(/\s+/).every((word) => haystack.includes(word));
}

/* period: 'all' | 'week' | 'month' | '3months'; day ('YYYY-MM-DD', from the calendar) wins over period. */
export function filterEntries(
  entries,
  { query = '', period = 'all', day = null, muscle = 'all', type = 'all', favorites = false, status = 'all' } = {},
  today = new Date()
) {
  const thisWeek = weekKeyOf(today);
  const thisMonth = monthKeyOf(today);
  const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 2, 1);
  return entries.filter(({ log, date, dayKey, weekKey, monthKey }) => {
    if (day && dayKey !== day) return false;
    if (!day) {
      if (period === 'week' && weekKey !== thisWeek) return false;
      if (period === 'month' && monthKey !== thisMonth) return false;
      if (period === '3months' && date < threeMonthsAgo) return false;
    }
    if (favorites && !log.favorite) return false;
    if (status !== 'all' && statusOf(log) !== status) return false;
    if (type !== 'all' && sessionType(log) !== type) return false;
    if (muscle !== 'all' && !muscleGroupsOf(log).includes(muscle)) return false;
    return matchesQuery(log, query);
  });
}

const exerciseCount = (e) => e.log.exercises?.length || 0;

export const SORTS = {
  recent: { label: 'Más reciente', fn: (a, b) => b.date - a.date },
  oldest: { label: 'Más antigua', fn: (a, b) => a.date - b.date },
  duration: { label: 'Mayor duración', fn: (a, b) => num(b.log.durationMinutes) - num(a.log.durationMinutes) || b.date - a.date },
  exercises: { label: 'Más ejercicios', fn: (a, b) => exerciseCount(b) - exerciseCount(a) || b.date - a.date },
  favorites: { label: 'Favoritas primero', fn: (a, b) => Number(Boolean(b.log.favorite)) - Number(Boolean(a.log.favorite)) || b.date - a.date },
};

export const sortEntries = (entries, sort = 'recent') => [...entries].sort((SORTS[sort] || SORTS.recent).fn);

/* Consecutive month sections for the list (used with date sorts). */
export function groupByMonth(entries) {
  const groups = [];
  for (const e of entries) {
    const last = groups[groups.length - 1];
    if (last && last.monthKey === e.monthKey) last.items.push(e);
    else groups.push({ monthKey: e.monthKey, items: [e] });
  }
  return groups;
}

/* ── Progress vs previous session ── */
export const exerciseKey = (e) =>
  e.exercise?._id || e.exercise?.name || (typeof e.exercise === 'string' ? e.exercise : '');

/* Heaviest set (ties → more reps). */
export function topSet(sets) {
  return (sets || []).reduce((best, s) => {
    const w = num(s.weight);
    const r = num(s.reps);
    if (!best || w > best.weight || (w === best.weight && r > best.reps)) return { weight: w, reps: r };
    return best;
  }, null);
}

/* For each exercise of `entry`, the top set of the latest earlier session that had it.
   `entries` must be sorted newest first (as indexLogs returns them). */
export function previousTopSets(entries, entry) {
  const result = new Map();
  const start = entries.indexOf(entry);
  const wanted = new Set((entry.log.exercises || []).map(exerciseKey).filter(Boolean));
  for (let i = start + 1; i < entries.length && result.size < wanted.size; i++) {
    for (const e of entries[i].log.exercises || []) {
      const key = exerciseKey(e);
      if (wanted.has(key) && !result.has(key)) result.set(key, { ...topSet(e.sets), date: entries[i].date });
    }
  }
  return result;
}
