/*
 * Session lifecycle — mirror of server/constants/workoutStatus.js.
 * Use these constants instead of raw strings anywhere in the client.
 */
export const WORKOUT_STATUS = Object.freeze({
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
});

export const OPEN_STATUSES = Object.freeze([WORKOUT_STATUS.PENDING, WORKOUT_STATUS.IN_PROGRESS, WORKOUT_STATUS.PAUSED]);

/* Labels and discreet badge styles (one neutral tone per state, no loud colors). */
export const STATUS_META = Object.freeze({
  [WORKOUT_STATUS.PENDING]: { label: 'Pendiente', badge: 'bg-zinc-800 text-zinc-300 border-white/10' },
  [WORKOUT_STATUS.IN_PROGRESS]: { label: 'En progreso', badge: 'bg-sky-400/10 text-sky-300 border-sky-400/20' },
  [WORKOUT_STATUS.PAUSED]: { label: 'Pausado', badge: 'bg-amber-400/10 text-amber-300 border-amber-400/20' },
  [WORKOUT_STATUS.COMPLETED]: { label: 'Completado', badge: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/20' },
  [WORKOUT_STATUS.CANCELLED]: { label: 'Cancelado', badge: 'bg-rose-400/10 text-rose-300 border-rose-400/20' },
});

/* Sessions saved before statuses existed were always finished ones. */
export const statusOf = (log) => log?.status || WORKOUT_STATUS.COMPLETED;
export const isOpen = (log) => OPEN_STATUSES.includes(statusOf(log));
