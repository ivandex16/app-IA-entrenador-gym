import { useEffect, useState } from 'react';
import { fmtTime, secondsSince } from './workoutUtils';

/*
 * Shows the time since `startTime` (frozen at `pausedAt` while paused). It is
 * the only component that re-renders every second: the parent stores just the
 * timestamps, so its tree (form, set rows, history) doesn't re-render on each tick.
 */
export default function ElapsedTime({ startTime, isActive, pausedAt = null, withHours = false }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!isActive || !startTime || pausedAt) return undefined;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [isActive, startTime, pausedAt]);

  if (!isActive || !startTime) return fmtTime(0, withHours);
  const seconds = pausedAt ? Math.max(0, Math.floor((pausedAt - startTime) / 1000)) : secondsSince(startTime);
  return fmtTime(seconds, withHours);
}
