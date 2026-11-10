/*
 * Review screen state: server draft → editable rows → the normal routine
 * payload (same shape as a routine created by hand, POST /api/routines).
 * Pure functions, unit-tested.
 */

const str = (f) => (f && f.value != null ? String(f.value) : '');

/* Server review reasons → the input that shows "⚠ Revisar". */
const REASON_FIELD = {
  exercise: 'exercise', 'exercise-approx': 'exercise', name: 'exercise',
  sets: 'sets', 'sets-missing': 'sets', reps: 'reps', 'reps-missing': 'reps',
  weight: 'weight', restSeconds: 'restSeconds', rir: 'rir', rpe: 'rpe', tempo: 'tempo',
};

let seq = 0;
export const newRowId = () => `row${Date.now().toString(36)}${(seq++).toString(36)}`;

export function rowFromDraft(ex) {
  const auto = ex.match?.status === 'auto' ? ex.match.exercise : null;
  return {
    id: newRowId(),
    detectedName: ex.detectedName || '',
    sourceText: (ex.sourceText || []).join('  /  '),
    exerciseId: auto ? auto._id : '',
    exerciseName: auto ? auto.name : '',
    matchStatus: ex.match?.status || 'none',
    approx: Boolean(auto && ex.match.confidence !== 'high'),
    candidates: ex.match?.candidates || [],
    sets: str(ex.sets),
    repsMin: ex.reps ? String(ex.reps.value.min) : '',
    repsMax: ex.reps && ex.reps.value.max !== ex.reps.value.min ? String(ex.reps.value.max) : '',
    weight: str(ex.weight),
    restSeconds: str(ex.restSeconds),
    rir: str(ex.rir),
    rpe: str(ex.rpe),
    tempo: str(ex.tempo),
    superset: ex.superset || '',
    notes: (ex.notes || []).join(' · '),
    review: [...new Set((ex.reviewReasons || []).map((r) => REASON_FIELD[r]).filter(Boolean))],
  };
}

export const emptyRow = () => ({
  id: newRowId(), detectedName: '', sourceText: '', exerciseId: '', matchStatus: 'manual', approx: false, candidates: [],
  sets: '', repsMin: '', repsMax: '', weight: '', restSeconds: '', rir: '', rpe: '', tempo: '', superset: '', notes: '',
  review: ['exercise', 'sets', 'reps'],
});

export function stateFromDraft(draft) {
  return {
    name: draft.name?.value || '',
    nameReview: !draft.name || draft.name.confidence === 'low',
    goal: 'general',
    days: (draft.days || []).map((d, i) => ({
      id: newRowId(),
      label: d.label || `Día ${i + 1}`,
      exercises: d.exercises.map(rowFromDraft),
    })),
    unparsed: draft.unparsed || [],
  };
}

/* Editing a flagged field counts as reviewing it. */
export function updateRow(row, patch) {
  const touched = Object.keys(patch).map((k) => (k === 'exerciseId' ? 'exercise' : k));
  return { ...row, ...patch, review: row.review.filter((f) => !touched.includes(f)) };
}

const isInt = (v, min, max) => /^\d+$/.test(String(v).trim()) && Number(v) >= min && Number(v) <= max;
const isNum = (v, min, max) => /^\d+([.,]\d+)?$/.test(String(v).trim()) && Number(String(v).replace(',', '.')) >= min && Number(String(v).replace(',', '.')) <= max;

/* Field errors per row id + overall problems. Empty optional fields are fine. */
export function validate(state) {
  const rows = {};
  const problems = [];
  if (!state.name.trim()) problems.push('Ponle un nombre a la rutina.');
  let count = 0;
  for (const day of state.days) {
    for (const r of day.exercises) {
      count += 1;
      const e = {};
      if (!r.exerciseId) e.exerciseId = 'Elige el ejercicio';
      if (!isInt(r.sets, 1, 20)) e.sets = 'Entre 1 y 20';
      if (!isInt(r.repsMin, 1, 200)) e.repsMin = 'Requerido';
      if (r.repsMax !== '' && (!isInt(r.repsMax, 1, 200) || Number(r.repsMax) < Number(r.repsMin))) e.repsMax = '≥ mín.';
      if (r.weight !== '' && !isNum(r.weight, 0, 1000)) e.weight = '0–1000';
      if (r.restSeconds !== '' && !isInt(r.restSeconds, 0, 1800)) e.restSeconds = '0–1800 s';
      if (r.rir !== '' && !/^\d{1,2}(-\d{1,2})?$/.test(r.rir.trim())) e.rir = 'Ej. 2 o 1-2';
      if (r.rpe !== '' && !/^\d{1,2}([.,]5)?(-\d{1,2}([.,]5)?)?$/.test(r.rpe.trim())) e.rpe = 'Ej. 8';
      if (Object.keys(e).length) rows[r.id] = e;
    }
  }
  if (count === 0) problems.push('Añade al menos un ejercicio.');
  const missing = Object.values(rows).filter((e) => e.exerciseId).length;
  const otherErrors = Object.values(rows).filter((e) => Object.keys(e).some((k) => k !== 'exerciseId')).length;
  if (missing) problems.push(`${missing} ${missing === 1 ? 'ejercicio sin asignar' : 'ejercicios sin asignar'}.`);
  if (otherErrors) problems.push(`Completa o corrige los datos marcados en ${otherErrors} ${otherErrors === 1 ? 'ejercicio' : 'ejercicios'}.`);
  return { rows, problems, ok: problems.length === 0 };
}

/* RIR / RPE / tempo / superset have no column in the routine model: they go into the notes. */
export function composeNotes(r) {
  return [
    r.notes.trim(),
    r.rir.trim() && `RIR ${r.rir.trim()}`,
    r.rpe.trim() && `RPE ${r.rpe.trim()}`,
    r.tempo.trim() && `Tempo ${r.tempo.trim()}`,
    r.superset && `Superserie ${r.superset}`,
  ].filter(Boolean).join(' · ');
}

/* Same shape as a routine created by hand. Empty weight → 0 (none), empty rest → 0
   (the workout then uses the user's default rest): nothing is invented. */
export function toRoutinePayload(state) {
  return {
    name: state.name.trim(),
    description: 'Importada desde imagen',
    goal: state.goal,
    exercises: [],
    days: state.days
      .filter((d) => d.exercises.length > 0)
      .map((d, i) => ({
        dayLabel: d.label.trim() || `Día ${i + 1}`,
        exercises: d.exercises.map((r, order) => ({
          exercise: r.exerciseId,
          order,
          sets: Number(r.sets),
          repsMin: Number(r.repsMin),
          repsMax: r.repsMax === '' ? Number(r.repsMin) : Number(r.repsMax),
          weight: r.weight === '' ? 0 : Number(String(r.weight).replace(',', '.')),
          restSeconds: r.restSeconds === '' ? 0 : Number(r.restSeconds),
          notes: composeNotes(r),
        })),
      })),
  };
}
