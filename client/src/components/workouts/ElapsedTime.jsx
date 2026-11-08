import { useEffect, useState } from 'react';
import { fmtTime, secondsSince } from './workoutUtils';

/*
 * Shows the time since `startTime`. It is the only component that re-renders
 * every second: the parent stores just the start timestamp, so its tree
 * (form, set rows, history) no longer re-renders on each tick.
 */
export default function ElapsedTime({ startTime, isActive }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!isActive || !startTime) return undefined;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [isActive, startTime]);

  return fmtTime(isActive ? secondsSince(startTime) : 0);
}
