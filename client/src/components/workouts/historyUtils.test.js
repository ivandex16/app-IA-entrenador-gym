// Run with: TZ=America/Bogota npx vitest run
import { describe, expect, it } from 'vitest';
import {
  indexLogs, summarizeMonth, weeklyStreak, monthGrid, shiftMonth, sessionTitle,
  totalSets, totalVolume, maxWeight, weekKeyOf, formatMinutes,
  muscleGroupsOf, sessionType, matchesQuery, filterEntries, sortEntries, groupByMonth, topSet, previousTopSets,
  pendingExercises, restInfo, formatRest, weeklyStreakFromWeeks,
} from './historyUtils';

const ex = (id, name, muscleGroup, sets) => ({ exercise: { _id: id, name, muscleGroup }, sets });
const push = (date, w, extra = {}) => ({
  _id: date,
  date,
  durationMinutes: 50,
  exercises: [
    ex('e1', 'Press banca', 'chest', [{ weight: w, reps: 8 }, { weight: w - 10, reps: 10 }]),
    ex('e2', 'Fondos', 'triceps', [{ weight: 0, reps: 12 }]),
  ],
  ...extra,
});

describe('search, filters and sort', () => {
  const entries = indexLogs([
    push('2026-11-09T18:00:00Z', 80, { notes: 'Rutina: Torso', favorite: true }),
    push('2026-11-03T18:00:00Z', 77.5),
    { _id: 'leg', date: '2026-08-01T18:00:00Z', durationMinutes: 90, exercises: [ex('e3', 'Sentadilla', 'legs', [{ weight: 100, reps: 5 }])] },
  ]);
  const today = new Date(2026, 10, 9);

  it('muscle groups and type', () => {
    expect(muscleGroupsOf(entries[0].log)).toEqual(['chest', 'triceps']);
    expect(sessionType(entries[0].log)).toBe('routine');
    expect(sessionType(entries[1].log)).toBe('free');
  });
  it('search ignores accents and case; matches exercise, routine and muscle (in Spanish)', () => {
    expect(matchesQuery(entries[2].log, 'SENTADÍLLA')).toBe(true);
    expect(matchesQuery(entries[0].log, 'torso')).toBe(true);
    expect(matchesQuery(entries[0].log, 'pecho')).toBe(true);
    expect(matchesQuery(entries[0].log, 'pierna')).toBe(false);
  });
  it('filters by period, day, muscle, type and favorites', () => {
    expect(filterEntries(entries, { period: 'month' }, today)).toHaveLength(2);
    expect(filterEntries(entries, { period: 'week' }, today)).toHaveLength(1);
    expect(filterEntries(entries, { period: '3months' }, today)).toHaveLength(2);
    expect(filterEntries(entries, { day: '2026-11-03' }, today)).toHaveLength(1);
    expect(filterEntries(entries, { muscle: 'legs' }, today)).toHaveLength(1);
    expect(filterEntries(entries, { type: 'routine' }, today)).toHaveLength(1);
    expect(filterEntries(entries, { favorites: true }, today)).toHaveLength(1);
  });
  it('sorts', () => {
    expect(sortEntries(entries, 'oldest')[0].log._id).toBe('leg');
    expect(sortEntries(entries, 'duration')[0].log._id).toBe('leg');
    expect(sortEntries(entries, 'exercises')[0].log.exercises).toHaveLength(2);
    expect(sortEntries(entries, 'favorites')[0].log.favorite).toBe(true);
  });
  it('groups consecutive entries by month', () => {
    expect(groupByMonth(entries).map((g) => [g.monthKey, g.items.length])).toEqual([['2026-11', 2], ['2026-08', 1]]);
  });
});

describe('status, pending exercises and rest', () => {
  it('filters by status (legacy = completed)', () => {
    const entries = indexLogs([
      { _id: 'a', date: '2026-11-08T18:00:00Z', status: 'in_progress', exercises: [] },
      { _id: 'b', date: '2026-11-07T18:00:00Z', status: 'paused', exercises: [] },
      { _id: 'c', date: '2026-11-06T18:00:00Z', status: 'cancelled', exercises: [] },
      { _id: 'd', date: '2026-11-05T18:00:00Z', exercises: [] },
    ]);
    expect(filterEntries(entries, { status: 'completed' }).map((e) => e.log._id)).toEqual(['d']);
    expect(filterEntries(entries, { status: 'paused' }).map((e) => e.log._id)).toEqual(['b']);
    expect(filterEntries(entries, { status: 'cancelled' })).toHaveLength(1);
  });
  it('pending exercises only when per-set progress was tracked', () => {
    const log = { exercises: [
      { exercise: { name: 'Press' }, sets: [{ completed: true }, { completed: false }] },
      { exercise: { name: 'Remo' }, sets: [{ completed: true }] },
      { exercise: { name: 'Legacy' }, sets: [{}, {}] },
    ] };
    expect(pendingExercises(log)).toEqual([{ name: 'Press', done: 1, total: 2 }]);
  });
  it('rest: planned per exercise and actual per set; old sessions have none', () => {
    expect(restInfo({ restSeconds: 90, sets: [{ restSeconds: 95 }, {}] })).toEqual({ planned: 90, actual: [95, null] });
    expect(restInfo({ sets: [{}] })).toEqual({ planned: null, actual: [null] });
    expect(formatRest(90)).toBe('1:30 min');
    expect(formatRest(45)).toBe('45 s');
    expect(formatRest(120)).toBe('2 min');
  });
  it('streak from server week keys', () => {
    const today = new Date(2026, 10, 9); // Mon
    expect(weeklyStreakFromWeeks(['2026-11-09', '2026-11-02', '2026-10-26', '2026-10-12'], today)).toBe(3);
    expect(weeklyStreakFromWeeks(['2026-11-02', '2026-10-26'], today)).toBe(2);
    expect(weeklyStreakFromWeeks([], today)).toBe(0);
  });
});

describe('progress vs previous session', () => {
  it('top set and previous top set per exercise', () => {
    expect(topSet([{ weight: 80, reps: 6 }, { weight: 80, reps: 8 }, { weight: 70, reps: 12 }])).toEqual({ weight: 80, reps: 8 });
    const entries = indexLogs([push('2026-11-09T18:00:00Z', 80), push('2026-11-03T18:00:00Z', 77.5), push('2026-10-20T18:00:00Z', 75)]);
    const prev = previousTopSets(entries, entries[0]);
    expect(prev.get('e1').weight).toBe(77.5);
    expect(prev.get('e2').reps).toBe(12);
    expect(previousTopSets(entries, entries[2]).size).toBe(0);
  });
});

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
