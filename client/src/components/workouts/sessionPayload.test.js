import { describe, expect, it } from 'vitest';
import { buildExercises, activeSecondsOf } from './sessionPayload';

const form = [
  { exercise: 'a', restSeconds: 90, sets: [{ reps: 8, weight: '62.5', restSeconds: 95 }, { reps: '', weight: '' }] },
  { exercise: 'b', sets: [{ reps: 12, weight: 0 }] },
  { exercise: '', sets: [{ reps: 1, weight: 1 }] }, // no exercise picked yet
];

describe('session payload', () => {
  it('live session: completed flags, planned rest per exercise and actual rest per set', () => {
    const out = buildExercises(form, { progress: { '0-0': true, '1-0': true }, defaultRest: 60 });
    expect(out).toHaveLength(2); // the empty row is dropped, indexes still match progress
    expect(out[0]).toEqual({
      exercise: 'a',
      restSeconds: 90,
      sets: [
        { setNumber: 1, reps: 8, weight: 62.5, completed: true, restSeconds: 95 },
        { setNumber: 2, reps: 0, weight: 0, completed: false },
      ],
    });
    expect(out[1].restSeconds).toBe(60); // falls back to the session's "entre series"
    expect(out[1].sets[0].completed).toBe(true);
  });

  it('typed-in session (no progress) sends no completed flags, like old sessions', () => {
    const out = buildExercises(form);
    expect(out[0].sets[0]).not.toHaveProperty('completed');
    expect(out[1]).not.toHaveProperty('restSeconds');
  });

  it('active time excludes pauses', () => {
    expect(activeSecondsOf(1_000, null, 61_000)).toBe(60);
    expect(activeSecondsOf(1_000, 31_000, 999_000)).toBe(30); // frozen while paused
    expect(activeSecondsOf(null, null)).toBe(0);
  });
});
