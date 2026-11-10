/*
 * Draft of a routine being built by hand. Lives only in the browser (state +
 * localStorage as a safety net) until the user presses "Guardar rutina": then
 * it becomes one POST /api/routines with every day and exercise.
 * Pure functions, unit-tested.
 */

export const WEEKDAYS = [
  { v: 'lunes', l: 'Lun', full: 'Lunes' },
  { v: 'martes', l: 'Mar', full: 'Martes' },
  { v: 'miercoles', l: 'Mié', full: 'Miércoles' },
  { v: 'jueves', l: 'Jue', full: 'Jueves' },
  { v: 'viernes', l: 'Vie', full: 'Viernes' },
  { v: 'sabado', l: 'Sáb', full: 'Sábado' },
  { v: 'domingo', l: 'Dom', full: 'Domingo' },
];

// Same starting values the routine editor uses when an exercise is added.
export const EXERCISE_DEFAULTS = { sets: '3', repsMin: '8', repsMax: '12', weight: '', restSeconds: '90', notes: '' };

let seq = 0;
const uid = () => `d${Date.now().toString(36)}${(seq++).toString(36)}`;

export const newDay = (weekday) => ({ id: uid(), weekday, exercises: [] });

export function emptyDraft() {
  return { name: '', description: '', goal: 'general', days: [newDay('lunes')] };
}

/* The draft has something worth protecting (exit warning, local copy). */
export function isDirty(d) {
  return Boolean(d.name.trim() || d.description.trim() || d.days.some((day) => day.exercises.length > 0));
}

export const dayLabel = (day) => WEEKDAYS.find((w) => w.v === day.weekday)?.full || 'Día';

/* Weekdays toggle: adding keeps week order; removing drops that day. */
export function toggleWeekday(d, weekday) {
  const has = d.days.some((day) => day.weekday === weekday);
  if (has) return { ...d, days: d.days.filter((day) => day.weekday !== weekday) };
  const order = (w) => WEEKDAYS.findIndex((x) => x.v === w);
  return { ...d, days: [...d.days, newDay(weekday)].sort((a, b) => order(a.weekday) - order(b.weekday)) };
}

/* Exercise picked in the catalog → draft row (keeps a light copy for display). */
export function addExercise(d, dayId, exercise) {
  return {
    ...d,
    days: d.days.map((day) => {
      if (day.id !== dayId || day.exercises.some((e) => e.exercise._id === exercise._id)) return day;
      const light = { _id: exercise._id, name: exercise.name, muscleGroup: exercise.muscleGroup, equipment: exercise.equipment, imageUrl: exercise.imageUrl, thumbnailUrl: exercise.thumbnailUrl, youtubeVideoId: exercise.youtubeVideoId, source: exercise.source };
      return { ...day, exercises: [...day.exercises, { key: uid(), exercise: light, ...EXERCISE_DEFAULTS }] };
    }),
  };
}

export function updateExercise(d, dayId, key, patch) {
  return { ...d, days: d.days.map((day) => (day.id !== dayId ? day : { ...day, exercises: day.exercises.map((e) => (e.key === key ? { ...e, ...patch } : e)) })) };
}

export function removeExercise(d, dayId, key) {
  return { ...d, days: d.days.map((day) => (day.id !== dayId ? day : { ...day, exercises: day.exercises.filter((e) => e.key !== key) })) };
}

export function moveExercise(d, dayId, key, delta) {
  return {
    ...d,
    days: d.days.map((day) => {
      if (day.id !== dayId) return day;
      const i = day.exercises.findIndex((e) => e.key === key);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= day.exercises.length) return day;
      const list = [...day.exercises];
      [list[i], list[j]] = [list[j], list[i]];
      return { ...day, exercises: list };
    }),
  };
}

const isInt = (v, min, max) => /^\d+$/.test(String(v).trim()) && Number(v) >= min && Number(v) <= max;
const isNum = (v, min, max) => {
  const s = String(v).trim().replace(',', '.');
  return /^\d+(\.\d+)?$/.test(s) && Number(s) >= min && Number(s) <= max;
};

/* { ok, problems[], fields: { [exerciseKey]: { field: message } }, nameError } */
export function validate(d) {
  const problems = [];
  const fields = {};
  const nameError = !d.name.trim() ? 'Ponle un nombre a la rutina' : d.name.trim().length > 100 ? 'Máximo 100 caracteres' : null;
  if (nameError) problems.push(nameError);
  if (d.days.length === 0) problems.push('Elige al menos un día de entrenamiento');
  const total = d.days.reduce((s, day) => s + day.exercises.length, 0);
  if (total === 0) problems.push('Agrega al menos un ejercicio');
  for (const day of d.days) {
    if (total > 0 && day.exercises.length === 0) problems.push(`${dayLabel(day)} no tiene ejercicios: agrégalos o quita el día`);
    for (const e of day.exercises) {
      const f = {};
      if (!isInt(e.sets, 1, 20)) f.sets = '1–20';
      if (!isInt(e.repsMin, 1, 200)) f.repsMin = '1–200';
      if (String(e.repsMax).trim() !== '' && (!isInt(e.repsMax, 1, 200) || Number(e.repsMax) < Number(e.repsMin))) f.repsMax = '≥ mín.';
      if (String(e.weight).trim() !== '' && !isNum(e.weight, 0, 1000)) f.weight = '0–1000';
      if (String(e.restSeconds).trim() !== '' && !isInt(e.restSeconds, 0, 1800)) f.restSeconds = '0–1800 s';
      if (Object.keys(f).length) fields[e.key] = f;
    }
  }
  const bad = Object.keys(fields).length;
  if (bad) problems.push(`Revisa los valores marcados en ${bad} ${bad === 1 ? 'ejercicio' : 'ejercicios'}`);
  return { ok: problems.length === 0, problems, fields, nameError };
}

/* The routine as the API expects it (same model as any other routine). */
export function toPayload(d) {
  return {
    name: d.name.trim(),
    description: d.description.trim(),
    goal: d.goal,
    days: d.days.map((day) => ({
      dayLabel: dayLabel(day),
      exercises: day.exercises.map((e, order) => ({
        exercise: e.exercise._id,
        order,
        sets: Number(e.sets),
        repsMin: Number(e.repsMin),
        repsMax: String(e.repsMax).trim() === '' ? Number(e.repsMin) : Number(e.repsMax),
        weight: String(e.weight).trim() === '' ? 0 : Number(String(e.weight).replace(',', '.')),
        restSeconds: String(e.restSeconds).trim() === '' ? 0 : Number(e.restSeconds),
        notes: e.notes.trim(),
      })),
    })),
  };
}

/* Rough session length for the summary (same idea as the routines list). */
export function estimateMinutes(day) {
  return Math.round(day.exercises.reduce((t, e) => {
    const sets = Number(e.sets) || 0;
    return t + sets * 1.5 + Math.max(0, sets - 1) * ((Number(e.restSeconds) || 90) / 60);
  }, 0));
}

/* ── Local copy (survives a reload / closed tab until saved or discarded) ── */
const key = (userId) => `temple.routineDraft.${userId || 'anon'}`;
export function saveLocal(userId, d) {
  try {
    if (isDirty(d)) localStorage.setItem(key(userId), JSON.stringify({ v: 1, savedAt: Date.now(), draft: d }));
    else localStorage.removeItem(key(userId));
  } catch { /* storage unavailable: the draft still lives in memory */ }
}
export function loadLocal(userId) {
  try {
    const raw = JSON.parse(localStorage.getItem(key(userId)));
    if (!raw || raw.v !== 1 || !raw.draft || !Array.isArray(raw.draft.days)) return null;
    if (Date.now() - raw.savedAt > 7 * 24 * 3600 * 1000) return null; // older than a week: drop it
    return raw.draft;
  } catch {
    return null;
  }
}
export function clearLocal(userId) {
  try { localStorage.removeItem(key(userId)); } catch { /* ignore */ }
}
