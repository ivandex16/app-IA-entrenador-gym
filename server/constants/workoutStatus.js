/*
 * Lifecycle of a workout session. Single source of truth for the server; the
 * client mirrors these values in client/src/components/workouts/workoutStatus.js.
 *
 *   pending ──start──▶ in_progress ◀──resume── paused
 *                         │   └──pause──▶ paused
 *                         ├──finish──▶ completed   (final)
 *                         └──cancel──▶ cancelled   (final)
 *
 * Sessions saved before this field existed have no `status`: they were only
 * ever saved when finished, so they count as COMPLETED (see the migration in
 * migrations/backfillWorkoutStatus.js and LEGACY_COMPLETED_FILTER below).
 */
const WORKOUT_STATUS = Object.freeze({
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
});

const ALL_STATUSES = Object.freeze(Object.values(WORKOUT_STATUS));
const FINAL_STATUSES = Object.freeze([WORKOUT_STATUS.COMPLETED, WORKOUT_STATUS.CANCELLED]);
const OPEN_STATUSES = Object.freeze([WORKOUT_STATUS.PENDING, WORKOUT_STATUS.IN_PROGRESS, WORKOUT_STATUS.PAUSED]);

/* Matches finished sessions, including legacy ones without a status. Use it
   wherever "workouts done" are counted (stats, reports, recommendations). */
const LEGACY_COMPLETED_FILTER = Object.freeze({
  $or: [{ status: WORKOUT_STATUS.COMPLETED }, { status: { $exists: false } }],
});

/* A finished session can't go back to an open state. */
function canTransition(from, to) {
  if (!to || from === to) return true;
  if (FINAL_STATUSES.includes(from || WORKOUT_STATUS.COMPLETED)) return FINAL_STATUSES.includes(to);
  return true;
}

module.exports = { WORKOUT_STATUS, ALL_STATUSES, FINAL_STATUSES, OPEN_STATUSES, LEGACY_COMPLETED_FILTER, canTransition };
