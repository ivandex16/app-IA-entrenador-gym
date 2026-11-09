/*
 * Form → API payload for a workout session (pure, tested).
 */
const toNum = (v) => Number(v) || 0;
export const clampRest = (sec) => Math.min(1800, Math.max(0, Math.round(sec)));

/* Form exercises → API shape.
   - progress: map of checked sets ('ex-set' → true) when the session tracks it, else null
     (a session typed in afterwards has no per-set progress, like old ones).
   - defaultRest: planned rest between sets when the exercise has none of its own. */
export function buildExercises(formExercises, { progress = null, defaultRest = 0 } = {}) {
  return (formExercises || [])
    .map((ex, i) => {
      const planned = toNum(ex.restSeconds) > 0 ? toNum(ex.restSeconds) : toNum(defaultRest);
      return {
        exercise: ex.exercise,
        ...(planned > 0 ? { restSeconds: clampRest(planned) } : {}),
        sets: (ex.sets || []).map((s, si) => ({
          setNumber: si + 1,
          reps: toNum(s.reps),
          weight: toNum(s.weight),
          ...(s.rpe ? { rpe: s.rpe } : {}),
          ...(progress ? { completed: Boolean(progress[`${i}-${si}`]) } : {}),
          ...(Number.isFinite(s.restSeconds) ? { restSeconds: clampRest(s.restSeconds) } : {}),
        })),
      };
    })
    .filter((e) => e.exercise);
}

/* Seconds actually trained: wall time since start minus pauses (startTime is shifted on resume). */
export const activeSecondsOf = (startTime, pausedAt, now = Date.now()) =>
  startTime ? Math.max(0, Math.floor(((pausedAt || now) - startTime) / 1000)) : 0;
