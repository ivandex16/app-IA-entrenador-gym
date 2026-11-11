/*
 * Progress per exercise and personal records (pure, unit-tested).
 *
 * For every session of an exercise we keep its best set, measured as an
 * estimated 1RM (Epley: weight × (1 + reps / 30)) so sets with different
 * weights and reps can be compared. Exercises done without weight use the most
 * reps in one set instead.
 *
 * Status of an exercise (last session within the last 12 weeks):
 *   improving — best of the last 4 weeks ≥ 2 % above the best before
 *   declining — best of the last 4 weeks ≥ 5 % below the best before
 *   stalled   — in between
 *   new       — fewer than 3 sessions, or nothing before the last 4 weeks
 *   paused    — not done in the last 4 weeks
 */
const { addDays, inRange } = require('./progressDates');

const IMPROVE = 0.02;
const DECLINE = 0.05;
const MAX_REPS_FOR_1RM = 15; // beyond this the estimate isn't meaningful
const round = (v, step = 0.5) => Math.round(v / step) * step;

function e1rm(weight, reps) {
  if (!weight || !reps) return 0;
  return reps === 1 ? weight : weight * (1 + reps / 30);
}

/* Best set of one session: { value, weight, reps } using the exercise's metric. */
function sessionBest(sets, metric) {
  let best = null;
  for (const s of sets || []) {
    if (s.completed === false || !s.reps) continue;
    const value = metric === 'reps' ? s.reps : s.reps <= MAX_REPS_FOR_1RM ? e1rm(s.weight, s.reps) : s.weight;
    if (!best || value > best.value || (value === best.value && s.weight > best.weight)) {
      best = { value, weight: s.weight || 0, reps: s.reps };
    }
  }
  return best && best.value > 0 ? best : null;
}

/*
 * entries: [{ day: 'YYYY-MM-DD', exercise: { _id, name, muscleGroup }, sets }]
 *          (one per exercise per session, any order, whole history)
 * today:   'YYYY-MM-DD' in the user's zone
 * recordsRange: { from, to } — records counted for the selected period
 */
function buildExerciseProgress(entries, { today, recordsRange }) {
  const horizonFrom = addDays(today, -(12 * 7 - 1));
  const recentFrom = addDays(today, -27);
  const byExercise = new Map();
  for (const e of entries) {
    if (!e.exercise?._id) continue;
    const id = String(e.exercise._id);
    if (!byExercise.has(id)) byExercise.set(id, { exercise: e.exercise, sessions: [] });
    byExercise.get(id).sessions.push(e);
  }

  const exercises = [];
  const records = [];
  for (const [id, { exercise, sessions }] of byExercise) {
    // Weighted if any completed set ever had weight; otherwise count reps.
    const weighted = sessions.some((s) => (s.sets || []).some((x) => x.completed !== false && x.weight > 0));
    const metric = weighted ? 'e1rm' : 'reps';
    const points = sessions
      .map((s) => ({ day: s.day, best: sessionBest(s.sets, metric) }))
      .filter((p) => p.best)
      .sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
    if (!points.length) continue;

    // Personal records: sessions that beat everything before them.
    let bestSoFar = null;
    for (const p of points) {
      if (bestSoFar && p.best.value > bestSoFar.value * 1.0001 && inRange(p.day, recordsRange)) {
        records.push({
          exerciseId: id, name: exercise.name, day: p.day, metric,
          value: metric === 'reps' ? p.best.value : round(p.best.value), weight: p.best.weight, reps: p.best.reps,
          previous: metric === 'reps' ? bestSoFar.value : round(bestSoFar.value),
        });
      }
      if (!bestSoFar || p.best.value > bestSoFar.value) bestSoFar = { ...p.best, day: p.day };
    }

    const inHorizon = points.filter((p) => p.day >= horizonFrom);
    if (!inHorizon.length) continue; // not done in the last 12 weeks: not listed
    const recent = inHorizon.filter((p) => p.day >= recentFrom);
    const before = inHorizon.filter((p) => p.day < recentFrom);
    const maxOf = (list) => list.reduce((m, p) => (!m || p.best.value > m.best.value ? p : m), null);
    const recentBest = maxOf(recent);
    const beforeBest = maxOf(before);

    let status;
    let changePct = null;
    if (!recent.length) status = 'paused';
    else if (inHorizon.length < 3 || !beforeBest) status = 'new';
    else {
      const change = recentBest.best.value / beforeBest.best.value - 1;
      changePct = Math.round(change * 100);
      status = change >= IMPROVE ? 'improving' : change <= -DECLINE ? 'declining' : 'stalled';
    }

    const fmt = (v) => (metric === 'reps' ? v : round(v));
    exercises.push({
      id,
      name: exercise.name,
      muscleGroup: exercise.muscleGroup,
      metric,
      status,
      changePct,
      sessions: inHorizon.length,
      lastDay: inHorizon[inHorizon.length - 1].day,
      current: recentBest ? { value: fmt(recentBest.best.value), weight: recentBest.best.weight, reps: recentBest.best.reps, day: recentBest.day } : null,
      best: { value: fmt(bestSoFar.value), weight: bestSoFar.weight, reps: bestSoFar.reps, day: bestSoFar.day },
      points: inHorizon.map((p) => ({ day: p.day, value: fmt(p.best.value), weight: p.best.weight, reps: p.best.reps })),
    });
  }

  const ORDER = { improving: 0, stalled: 1, declining: 2, new: 3, paused: 4 };
  exercises.sort((a, b) => ORDER[a.status] - ORDER[b.status] || b.sessions - a.sessions || a.name.localeCompare(b.name, 'es'));
  // One record per exercise (its latest in the period): beating your best in
  // every session of a good month is one achievement per lift, not twenty.
  records.sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0));
  const seen = new Set();
  const latestRecords = records.filter((r) => !seen.has(r.exerciseId) && seen.add(r.exerciseId));

  const counts = { improving: 0, stalled: 0, declining: 0, new: 0, paused: 0 };
  for (const e of exercises) counts[e.status]++;
  return { horizon: { from: horizonFrom, to: today }, recentFrom, counts, exercises, records: latestRecords, recordSessions: records.length };
}

module.exports = { e1rm, sessionBest, buildExerciseProgress };
