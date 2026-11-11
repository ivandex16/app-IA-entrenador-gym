const { buildConsistency } = require('../consistency');
const { addDays } = require('../progressDates');

const TODAY = '2026-11-11'; // Wednesday; current week starts Monday 9 Nov
const MON = '2026-11-09';
const week = (n, offsets) => offsets.map((o) => addDays(MON, -7 * n + o)); // n weeks ago, Monday + offsets

describe('consistency', () => {
  test('12 calendar weeks, training days per week (same day counted once)', () => {
    const days = [...week(0, [0, 0, 2]), ...week(1, [0, 2, 4]), ...week(11, [1])];
    const c = buildConsistency(days, { today: TODAY, goal: 3 });
    expect(c.weeks).toHaveLength(12);
    expect(c.weeks[0]).toMatchObject({ from: '2026-08-24', to: '2026-08-30', days: 1, met: false });
    expect(c.weeks[10]).toMatchObject({ from: '2026-11-02', days: 3, met: true, current: false });
    expect(c.weeks[11]).toMatchObject({ from: MON, days: 2, current: true });
    expect(c).toMatchObject({ totalDays: 6, weeksTrained: 3, weeksMet: 1, completedWeeks: 11, perWeek: 0.5 });
    expect(c.thisWeek).toEqual({ days: 2, remaining: 1 });
  });

  test('streak: completed weeks meeting the goal; the current week only adds once met', () => {
    const base = [...week(1, [0, 2, 4]), ...week(2, [0, 2, 4]), ...week(3, [0, 2])];
    expect(buildConsistency(base, { today: TODAY, goal: 3 }).streak).toBe(2);
    expect(buildConsistency([...base, ...week(0, [0, 1, 2])], { today: TODAY, goal: 3 }).streak).toBe(3);
    // a week without meeting the goal breaks it
    expect(buildConsistency([...week(2, [0, 2, 4])], { today: TODAY, goal: 3 }).streak).toBe(0);
  });

  test('best streak over the whole history, beyond the 12 weeks shown', () => {
    const old = [20, 21, 22, 23, 24].flatMap((n) => week(n, [0, 2, 4]));
    const c = buildConsistency([...old, ...week(1, [0, 2, 4])], { today: TODAY, goal: 3 });
    expect(c).toMatchObject({ streak: 1, bestStreak: 5 });
  });

  test('goal from the profile, kept between 1 and 7; future days ignored', () => {
    expect(buildConsistency(week(1, [0, 3]), { today: TODAY, goal: 2 }).weeks[10].met).toBe(true);
    expect(buildConsistency([], { today: TODAY, goal: 12 }).goal).toBe(7);
    expect(buildConsistency([], { today: TODAY }).goal).toBe(3);
    expect(buildConsistency(['2026-11-14'], { today: TODAY, goal: 3 }).totalDays).toBe(0);
  });

  test('no history at all', () => {
    expect(buildConsistency([], { today: TODAY, goal: 3 })).toMatchObject({ totalDays: 0, streak: 0, bestStreak: 0, weeksTrained: 0 });
  });
});
