/*
 * Draft of the workout being registered or trained, kept in localStorage so it
 * survives leaving the page, closing the tab or the Android app being killed.
 *
 * Timers are stored as timestamps (startTime, rest.endsAt), so on restore the
 * clock simply continues: the time spent away still counts.
 *
 * The key includes the user id, so on a shared device one account never sees
 * another account's draft.
 */

const PREFIX = 'appgym.workoutDraft.';
const VERSION = 1;
// A draft untouched for this long is treated as abandoned and dropped.
const MAX_AGE_MS = 12 * 60 * 60 * 1000;

const keyFor = (userId) => `${PREFIX}${userId || 'anon'}`;

export function saveWorkoutDraft(userId, draft) {
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify({ v: VERSION, savedAt: Date.now(), ...draft }));
  } catch {
    // Storage full or blocked: the session still works, it just won't survive a reload.
  }
}

export function clearWorkoutDraft(userId) {
  try {
    localStorage.removeItem(keyFor(userId));
  } catch {
    // ignore
  }
}

/* Returns a usable draft, or null when there is none or it's invalid/abandoned. */
export function loadWorkoutDraft(userId) {
  let draft;
  try {
    draft = JSON.parse(localStorage.getItem(keyFor(userId)));
  } catch {
    return null;
  }
  const valid =
    draft &&
    draft.v === VERSION &&
    Date.now() - Number(draft.savedAt) < MAX_AGE_MS &&
    draft.form &&
    Array.isArray(draft.form.exercises) &&
    (!draft.isActive || Number(draft.startTime) > 0);
  if (!valid) {
    clearWorkoutDraft(userId);
    return null;
  }
  // A rest that ran out while the user was away is simply over (no late alert).
  const rest = draft.rest && Number(draft.rest.endsAt) > Date.now() ? draft.rest : null;
  return {
    form: draft.form,
    isActive: Boolean(draft.isActive),
    startTime: draft.isActive ? Number(draft.startTime) : null,
    pausedAt: draft.isActive && Number(draft.pausedAt) > 0 ? Number(draft.pausedAt) : null,
    completedSets: draft.completedSets && typeof draft.completedSets === 'object' ? draft.completedSets : {},
    rest: draft.isActive ? rest : null,
    sessionRest: draft.sessionRest || null,
    plannedRest: draft.plannedRest || null,
  };
}
