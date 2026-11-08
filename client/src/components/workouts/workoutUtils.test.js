// Run with a fixed zone to reproduce Colombia: TZ=America/Bogota npx vitest run
import { afterEach, describe, expect, it, vi } from 'vitest';
import { todayLocalISO, localDayToInstant, workoutDisplayDate, fmtTime, fmtPreset } from './workoutUtils';

const inBogota = Intl.DateTimeFormat().resolvedOptions().timeZone === 'America/Bogota';

afterEach(() => vi.useRealTimers());

describe.runIf(inBogota)('dates in America/Bogota (UTC-5)', () => {
  it('today is the local day even after 7 pm (when UTC is already tomorrow)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-09T01:30:00Z')); // 8:30 pm on Nov 8 in Bogotá
    expect(todayLocalISO()).toBe('2026-11-08');
  });

  it("today's date is saved as the current instant", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-09T01:30:00Z'));
    expect(localDayToInstant('2026-11-08')).toBe('2026-11-09T01:30:00.000Z');
  });

  it('a past day is saved as local noon, which stays on that day', () => {
    const saved = localDayToInstant('2026-11-01');
    expect(saved).toBe('2026-11-01T17:00:00.000Z');
    expect(new Date(saved).getDate()).toBe(1);
  });

  it('old records stored as UTC midnight keep their calendar day', () => {
    const d = workoutDisplayDate('2026-11-08T00:00:00.000Z');
    expect(d.getDate()).toBe(8);
    expect(d.getMonth()).toBe(10);
  });

  it('new records are shown in local time', () => {
    const d = workoutDisplayDate('2026-11-09T01:30:00.000Z');
    expect(d.getDate()).toBe(8);
  });
});

describe('formatting', () => {
  it('formats times and presets', () => {
    expect(fmtTime(75)).toBe('01:15');
    expect(fmtTime(75, true)).toBe('00:01:15');
    expect(fmtTime(3725)).toBe('01:02:05');
    expect(fmtPreset(90)).toBe('1m 30s');
    expect(fmtPreset(180)).toBe('3m');
    expect(fmtPreset(45)).toBe('45s');
  });

  it('leaves full timestamps untouched', () => {
    expect(localDayToInstant('2026-11-08T10:00:00.000Z')).toBe('2026-11-08T10:00:00.000Z');
  });
});
