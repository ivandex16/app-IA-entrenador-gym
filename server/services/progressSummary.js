/*
 * Pure pieces of the progress report (unit-tested): totals of a set of
 * sessions, a fair comparison with the previous range, and the sentence that
 * answers "¿voy bien?" at the top of the Progreso view.
 */

const ALL_GROUPS = ['chest', 'back', 'shoulders', 'legs', 'biceps', 'triceps', 'abs'];
const MG_ES = { chest: 'pecho', back: 'espalda', shoulders: 'hombros', legs: 'piernas', biceps: 'bíceps', triceps: 'tríceps', abs: 'abdominales' };

/* Totals of finished sessions. Planned sets not done (completed: false) don't count. */
function summarize(logs) {
  let totalVolume = 0;
  let totalSets = 0;
  let totalReps = 0;
  let maxWeight = 0;
  let totalCalories = 0;
  const muscleGroups = {};
  const exercisesPerformed = new Set();
  for (const log of logs) {
    totalCalories += log.caloriesBurned || 0;
    for (const entry of log.exercises || []) {
      exercisesPerformed.add(entry.exercise?.name || 'Ejercicio');
      const mg = entry.exercise?.muscleGroup || 'unknown';
      muscleGroups[mg] = (muscleGroups[mg] || 0) + 1;
      for (const s of entry.sets || []) {
        if (s.completed === false) continue;
        totalSets++;
        totalReps += s.reps || 0;
        totalVolume += (s.reps || 0) * (s.weight || 0);
        if ((s.weight || 0) > maxWeight) maxWeight = s.weight;
      }
    }
  }
  return {
    workouts: logs.length,
    totalSets,
    totalReps,
    totalVolume: Math.round(totalVolume),
    maxWeight,
    totalCalories,
    exercisesPerformed: [...exercisesPerformed],
    muscleGroups,
  };
}

/* % change, or null when there is nothing to compare with (never a fake +100%). */
const pctOrNull = (cur, prev) => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null);

function compare(cur, prev) {
  const volumePct = pctOrNull(cur.totalVolume, prev.totalVolume);
  return {
    workoutsChange: cur.workouts - prev.workouts,
    setsChange: cur.totalSets - prev.totalSets,
    volumePct,
    setsPct: pctOrNull(cur.totalSets, prev.totalSets),
    hasPrevious: prev.workouts > 0,
    // Legacy fields (Inicio uses them): numbers, as before.
    volumeChange: volumePct ?? 0,
    maxWeightChange: cur.maxWeight - prev.maxWeight,
  };
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/* One sentence: where you are and how it compares, in plain words. */
function summarySentence(periodType, cur, prev, cmp) {
  const ref = periodType === 'week'
    ? 'la semana pasada a estas alturas'
    : `las ${periodType === '4w' ? 4 : 12} semanas anteriores`;
  if (periodType === 'week' && cur.workouts === 0) {
    return prev.workouts > 0
      ? `Aún no has entrenado esta semana; a estas alturas de la semana pasada llevabas ${plural(prev.workouts, 'entrenamiento', 'entrenamientos')}.`
      : 'Aún no has entrenado esta semana.';
  }
  const weeks = periodType === '4w' ? 4 : periodType === '12w' ? 12 : 1;
  const lead = periodType === 'week'
    ? `Esta semana llevas ${plural(cur.workouts, 'entrenamiento', 'entrenamientos')}`
    : `En las últimas ${weeks} semanas hiciste ${plural(cur.workouts, 'entrenamiento', 'entrenamientos')} (${(cur.workouts / weeks).toFixed(1).replace('.', ',').replace(',0', '')} por semana)`;
  if (cur.workouts === 0) return `${lead}.`;
  if (!cmp.hasPrevious) return `${lead}. No hay entrenamientos en ${ref} para comparar.`;
  const v = cmp.volumePct;
  if (v == null) return `${lead}.`;
  if (v >= 5) return `${lead} y vas por encima de ${ref}: volumen +${v}%.`;
  if (v <= -5) return `${lead}; el volumen va ${Math.abs(v)}% por debajo de ${ref}.`;
  return `${lead}, un volumen similar al de ${ref}.`;
}

/*
 * Short observations that the sentence doesn't already say. Muscles not
 * trained are only pointed out when the range is long enough to judge it
 * (from Friday in the weekly view).
 */
function baseInsights(periodType, daysElapsed, cur) {
  const insights = [];
  const judge = periodType !== 'week' || daysElapsed >= 5;
  const missed = ALL_GROUPS.filter((g) => !cur.muscleGroups[g]);
  if (judge && cur.workouts > 0 && missed.length > 0) {
    const when = periodType === 'week' ? 'esta semana' : 'en este periodo';
    insights.push(`💡 Grupos musculares sin entrenar ${when}: ${missed.map((g) => MG_ES[g]).join(', ')}.`);
  }
  return insights;
}

module.exports = { summarize, compare, summarySentence, baseInsights, pctOrNull, ALL_GROUPS };
