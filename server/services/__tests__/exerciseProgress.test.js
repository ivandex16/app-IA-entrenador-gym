const { e1rm, sessionBest, buildExerciseProgress } = require('../exerciseProgress');
const { addDays } = require('../progressDates');

const TODAY = '2026-11-10';
const bench = { _id: 'b', name: 'Press de Banca', muscleGroup: 'chest' };
const pull = { _id: 'p', name: 'Dominadas', muscleGroup: 'back' };
const s = (weight, reps, completed) => ({ weight, reps, ...(completed === undefined ? {} : { completed }) });
const at = (daysAgo, exercise, sets) => ({ day: addDays(TODAY, -daysAgo), exercise, sets });
const build = (entries, recordsRange = { from: addDays(TODAY, -27), to: TODAY }) => buildExerciseProgress(entries, { today: TODAY, recordsRange });

describe('estimated 1RM and best set', () => {
  test('Epley, and a single rep is the weight itself', () => {
    expect(e1rm(100, 1)).toBe(100);
    expect(e1rm(60, 10)).toBe(80);
    expect(e1rm(0, 10)).toBe(0);
  });

  test('best set of a session ignores sets not completed', () => {
    expect(sessionBest([s(60, 10), s(70, 8), s(100, 5, false)], 'e1rm')).toEqual({ value: 70 * (1 + 8 / 30), weight: 70, reps: 8 });
    expect(sessionBest([s(0, 8), s(0, 12), s(0, 15, false)], 'reps')).toEqual({ value: 12, weight: 0, reps: 12 });
    expect(sessionBest([s(50, 0)], 'e1rm')).toBeNull();
  });
});

describe('status per exercise', () => {
  test('improving: the last 4 weeks beat what came before by 2 % or more', () => {
    const r = build([at(60, bench, [s(60, 8)]), at(45, bench, [s(62.5, 8)]), at(20, bench, [s(65, 8)]), at(5, bench, [s(67.5, 8)])]);
    expect(r.exercises[0]).toMatchObject({ name: 'Press de Banca', status: 'improving', sessions: 4, metric: 'e1rm', changePct: 8 });
    expect(r.exercises[0].best).toMatchObject({ weight: 67.5, reps: 8, day: addDays(TODAY, -5) });
    expect(r.exercises[0].points).toHaveLength(4);
  });

  test('stalled: same level; declining: 5 % or more below', () => {
    const stalled = build([at(50, bench, [s(70, 8)]), at(40, bench, [s(70, 8)]), at(10, bench, [s(70, 8)])]);
    expect(stalled.exercises[0]).toMatchObject({ status: 'stalled', changePct: 0 });
    const declining = build([at(50, bench, [s(80, 8)]), at(40, bench, [s(80, 8)]), at(10, bench, [s(70, 8)])]);
    expect(declining.exercises[0]).toMatchObject({ status: 'declining', changePct: -12 });
  });

  test('new with few sessions or nothing before; paused when not done for 4 weeks', () => {
    expect(build([at(10, bench, [s(60, 8)]), at(3, bench, [s(62.5, 8)])]).exercises[0].status).toBe('new');
    expect(build([at(70, bench, [s(60, 8)]), at(50, bench, [s(60, 8)]), at(35, bench, [s(60, 8)])]).exercises[0].status).toBe('paused');
    // done only before the last 12 weeks → not listed
    expect(build([at(100, bench, [s(60, 8)])]).exercises).toHaveLength(0);
  });

  test('several sessions on the same day are one point (the best of the day)', () => {
    const r = build([at(2, bench, [s(60, 8)]), at(2, bench, [s(65, 8)]), at(2, bench, [s(62.5, 8)]), at(2, bench, [s(60, 10)])]);
    expect(r.exercises[0]).toMatchObject({ sessions: 1, status: 'new' });
    expect(r.exercises[0].points).toEqual([{ day: addDays(TODAY, -2), value: 82.5, weight: 65, reps: 8 }]);
    expect(r.records).toHaveLength(0); // the same day can't beat itself
  });

  test('exercises without weight use reps', () => {
    const r = build([at(50, pull, [s(0, 6)]), at(40, pull, [s(0, 7)]), at(10, pull, [s(0, 9)])]);
    expect(r.exercises[0]).toMatchObject({ metric: 'reps', status: 'improving', best: { value: 9 } });
  });

  test('order: improving, stalled, declining, new, paused; counts per status', () => {
    const r = build([
      at(50, bench, [s(80, 8)]), at(40, bench, [s(80, 8)]), at(10, bench, [s(70, 8)]),
      at(50, pull, [s(0, 6)]), at(40, pull, [s(0, 7)]), at(10, pull, [s(0, 9)]),
    ]);
    expect(r.exercises.map((e) => e.status)).toEqual(['improving', 'declining']);
    expect(r.counts).toMatchObject({ improving: 1, declining: 1, stalled: 0 });
  });
});

describe('personal records', () => {
  test('a session that beats the whole history before it, inside the period', () => {
    const r = build([at(200, bench, [s(80, 5)]), at(40, bench, [s(70, 8)]), at(12, bench, [s(82.5, 5)]), at(3, bench, [s(82.5, 5)])]);
    expect(r.records).toHaveLength(1); // the 3-days-ago session only ties
    expect(r.records[0]).toMatchObject({ name: 'Press de Banca', day: addDays(TODAY, -12), weight: 82.5, reps: 5, value: 96.5, previous: 93.5 });
  });

  test('one record per exercise: the latest in the period', () => {
    const r = build([at(40, bench, [s(60, 5)]), at(20, bench, [s(65, 5)]), at(10, bench, [s(70, 5)]), at(3, bench, [s(75, 5)])]);
    expect(r.recordSessions).toBe(3);
    expect(r.records).toHaveLength(1);
    expect(r.records[0]).toMatchObject({ day: addDays(TODAY, -3), weight: 75 });
  });

  test('the first session is not a record, and records outside the period are not counted', () => {
    expect(build([at(5, bench, [s(80, 5)])]).records).toHaveLength(0);
    const r = build([at(60, bench, [s(60, 5)]), at(40, bench, [s(70, 5)])], { from: addDays(TODAY, -6), to: TODAY });
    expect(r.records).toHaveLength(0);
  });
});
