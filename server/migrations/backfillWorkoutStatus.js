/*
 * Migration: workout `status` backfill (2026-11).
 *
 *   Field              Type     Default       Nullable  Backfill
 *   status             String   'completed'   no        legacy docs → 'completed'
 *   startedAt          Date     —             yes       none (unknown for old sessions)
 *   endedAt            Date     —             yes       none (unknown for old sessions)
 *   activeSeconds      Number   —             yes       none
 *   exercises.restSeconds         Number  —   yes       none (old sessions had no rest saved)
 *   exercises.sets.restSeconds    Number  —   yes       none
 *   exercises.sets.completed      Boolean —   yes       none (absent = every listed set was done)
 *
 * Why 'completed': before this change the app only saved a session when the
 * user finished it (or registered it manually afterwards), so every existing
 * document is evidence of a finished session.
 *
 * Safe to run any number of times: it only touches documents without `status`,
 * adds one field and never removes or rewrites anything else. Reads already
 * treat a missing status as completed (LEGACY_COMPLETED_FILTER), so the app
 * works the same before and after it runs.
 */
const WorkoutLog = require('../models/WorkoutLog');
const { WORKOUT_STATUS } = require('../constants/workoutStatus');

async function backfillWorkoutStatus({ dryRun = false } = {}) {
  const filter = { status: { $exists: false } };
  const pending = await WorkoutLog.collection.countDocuments(filter);
  if (dryRun || pending === 0) return { pending, updated: 0 };
  // Raw collection update: bypasses Mongoose so no other field is touched.
  const res = await WorkoutLog.collection.updateMany(filter, { $set: { status: WORKOUT_STATUS.COMPLETED } });
  return { pending, updated: res.modifiedCount };
}

module.exports = { backfillWorkoutStatus };
