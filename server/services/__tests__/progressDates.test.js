const { dayKey, weekBounds, queryWindow, inRange, safeTimeZone } = require('../progressDates');

describe('progress dates in the user time zone', () => {
  test('a Sunday-night workout in Bogotá stays on Sunday (it is Monday in UTC)', () => {
    const sundayNight = new Date('2026-11-16T02:00:00.000Z'); // Sun 15 Nov 21:00 in Bogotá
    expect(dayKey(sundayNight, 'America/Bogota')).toBe('2026-11-15');
    expect(dayKey(sundayNight, 'UTC')).toBe('2026-11-16');
  });

  test('old sessions saved at UTC midnight keep their calendar day in any zone', () => {
    expect(dayKey(new Date('2026-11-09T00:00:00.000Z'), 'America/Bogota')).toBe('2026-11-09');
    expect(dayKey(new Date('2026-11-09T00:00:00.000Z'), 'Asia/Tokyo')).toBe('2026-11-09');
  });

  test('weeks run Monday–Sunday, also across a month boundary', () => {
    expect(weekBounds('2026-11-10', 'UTC')).toEqual({
      today: '2026-11-10',
      current: { from: '2026-11-09', to: '2026-11-15' },
      previous: { from: '2026-11-02', to: '2026-11-08' },
    });
    expect(weekBounds('2026-11-15', 'UTC').current).toEqual({ from: '2026-11-09', to: '2026-11-15' }); // Sunday
    expect(weekBounds('2026-12-02', 'UTC').previous).toEqual({ from: '2026-11-23', to: '2026-11-29' });
  });

  test('"today" is taken in the user zone', () => {
    const mondayEarlyUtc = new Date('2026-11-16T03:00:00.000Z'); // still Sunday 22:00 in Bogotá
    expect(weekBounds(mondayEarlyUtc, 'America/Bogota').current.from).toBe('2026-11-09');
    expect(weekBounds(mondayEarlyUtc, 'UTC').current.from).toBe('2026-11-16');
  });

  test('the query window covers the whole range in any zone', () => {
    const w = queryWindow('2026-11-02', '2026-11-15');
    expect(w.$gte.toISOString()).toBe('2026-11-01T00:00:00.000Z');
    expect(w.$lt.toISOString()).toBe('2026-11-17T00:00:00.000Z');
    expect(inRange('2026-11-15', { from: '2026-11-09', to: '2026-11-15' })).toBe(true);
    expect(inRange('2026-11-16', { from: '2026-11-09', to: '2026-11-15' })).toBe(false);
  });

  test('unknown zones fall back to UTC', () => {
    expect(safeTimeZone('Mars/Olympus')).toBe('UTC');
    expect(safeTimeZone('America/Bogota')).toBe('America/Bogota');
  });
});
