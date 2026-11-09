// Run with: TZ=America/Bogota npx vitest run
import { describe, expect, it } from 'vitest';
import {
  indexLogs, summarizeMonth, weeklyStreak, monthGrid, shiftMonth, sessionTitle,
  totalSets, totalVolume, maxWeight, weekKeyOf, formatMinutes,
} from './historyUtils';

const log = (date, extra = {}) => ({
  date,
  durationMinutes: 50,
  exercises: [
    { exercise: { name: 'Press banca' }, sets: [{ weight: 60, reps: 10 }, { weight: 70, reps: 8 }] },
    { exercise: { name: 'Fondos' }, sets: [{ weight: '', reps: 12 }] },
  ],
  ...extra,
});

describe('session metrics', () => {
  it('sets, volume (kg × reps) and max weight', () => {
    const l = log('2026-11-09T18:00:00Z');
    expect(totalSets(l)).toBe(3);
    expect(totalVolume(l)).toBe(60 * 10 + 70 * 8);
    expect(maxWeight(l)).toBe(70);
  });

  it('title prefers the routine name, else the first exercises', () => {
    expect(sessionTitle(log('2026-11-09T18:00:00Z', { notes: 'Rutina: Torso — Día 1' }))).toBe('Torso — Día 1');
    expect(sessionTitle(log('2026-11-09T18:00:00Z'))).toBe('Press banca + Fondos');
    expect(sessionTitle({ exercises: [] })).toBe('Entrenamiento');
  });
});

describe('grouping', () => {
  it('sorts newest first and keys by local month/day', () => {
    const entries = indexLogs([log('2026-10-31T15:00:00Z'), log('2026-11-02T15:00:00Z')]);
    expect(entries[0].dayKey).toBe('2026-11-02');
    expect(entries[1].monthKey).toBe('2026-10');
  });

  it('old UTC-midnight records keep their calendar day', () => {
    expect(indexLogs([log('2026-11-01T00:00:00.000Z')])[0].dayKey).toBe('2026-11-01');
  });

  it('month summary counts sessions, minutes, volume and distinct days', () => {
    const entries = indexLogs([log('2026-11-02T15:00:00Z'), log('2026-11-02T20:00:00Z'), log('2026-11-05T15:00:00Z')]);
    const s = summarizeMonth(entries);
    expect(s.sessions).toBe(3);
    expect(s.minutes).toBe(150);
    expect(s.volume).toBe(3 * (600 + 560));
    expect(s.days.size).toBe(2);
  });
});

describe('weekly streak', () => {
  const today = new Date(2026, 10, 9); // Monday 9 Nov 2026
  it('counts consecutive weeks up to this one', () => {
    const entries = indexLogs([log('2026-11-09T15:00:00Z'), log('2026-11-04T15:00:00Z'), log('2026-10-28T15:00:00Z'), log('2026-10-14T15:00:00Z')]);
    expect(weeklyStreak(entries, today)).toBe(3);
  });
  it("this week without sessions yet doesn't break the streak", () => {
    const entries = indexLogs([log('2026-11-04T15:00:00Z'), log('2026-10-28T15:00:00Z')]);
    expect(weeklyStreak(entries, today)).toBe(2);
  });
  it('is 0 with no recent sessions', () => {
    expect(weeklyStreak(indexLogs([log('2026-09-01T15:00:00Z')]), today)).toBe(0);
  });
  it('weeks start on Monday', () => {
    expect(weekKeyOf(new Date(2026, 10, 15))).toBe('2026-11-09'); // Sunday → previous Monday
  });
});

describe('calendar', () => {
  it('November 2026 starts on Sunday → 6 blanks, 30 days', () => {
    const cells = monthGrid('2026-11');
    expect(cells.slice(0, 6).every((c) => c === null)).toBe(true);
    expect(cells.filter(Boolean)).toHaveLength(30);
  });
  it('shifts months across years', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  });
  it('formats minutes', () => {
    expect(formatMinutes(45)).toBe('45 min');
    expect(formatMinutes(125)).toBe('2 h 5 min');
  });
});
