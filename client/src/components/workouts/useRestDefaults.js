import { useEffect, useState } from 'react';

const STORAGE_KEY = 'appgym.restDefaults';
export const FALLBACK_REST = { betweenSets: 90, betweenExercises: 180 };

/* Accepts any { betweenSets, betweenExercises }-like value and returns a valid one (or null). */
export function normalizeRest(value) {
  if (!value || typeof value !== 'object') return null;
  const betweenSets = Number(value.betweenSets);
  const betweenExercises = Number(value.betweenExercises);
  if (!(betweenSets > 0) || !(betweenExercises > 0)) return null;
  return { betweenSets, betweenExercises };
}

export function readRestDefaults() {
  try {
    return normalizeRest(JSON.parse(localStorage.getItem(STORAGE_KEY))) || FALLBACK_REST;
  } catch {
    return FALLBACK_REST;
  }
}

/*
 * The user's default rest durations (seconds), remembered on this device.
 * Shared by the routine screen (set them before starting) and the workout
 * screen (pre-start plan). Returns [defaults, setDefaults], like useState.
 */
export default function useRestDefaults() {
  const [defaults, setDefaults] = useState(readRestDefaults);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
    } catch {
      // Storage unavailable (private mode, blocked): keep the values in memory only.
    }
  }, [defaults]);

  return [defaults, setDefaults];
}
