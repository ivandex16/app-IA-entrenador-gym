// Run with: TZ=America/Bogota npx vitest run
import { describe, expect, it, vi } from 'vitest';
import { createHistoryCache, monthRange, fetchRange, PAGE_SIZE } from './historyCache';
import { statusOf, isOpen, WORKOUT_STATUS } from './workoutStatus';

const log = (id, iso, extra = {}) => ({ _id: id, date: iso, exercises: [], ...extra });

/* Fake API: sessions in Oct/Nov 2026; returns pages like the server. */
function fakeApi(all) {
  const calls = [];
  const fetchPage = vi.fn(async ({ from, to, limit, cursor }) => {
    calls.push({ from, to, cursor });
    const inRange = all.filter((l) => l.date >= from && l.date <= to).sort((a, b) => b.date.localeCompare(a.date));
    const start = cursor ? Number(cursor) : 0;
    const items = inRange.slice(start, start + limit);
    return { items, nextCursor: start + limit < inRange.length ? String(start + limit) : null };
  });
  return { fetchPage, calls };
}

describe('monthRange', () => {
  it('local month boundaries as instants (Bogotá = UTC-5)', () => {
    expect(monthRange('2026-10')).toEqual({ from: '2026-10-01T05:00:00.000Z', to: '2026-11-01T04:59:59.999Z' });
  });
});

describe('fetchRange', () => {
  it('pads the month so legacy UTC-midnight sessions are caught, then trims them to their day', async () => {
    expect(fetchRange('2026-11')).toEqual({ from: '2026-10-31T15:00:00.000Z', to: '2026-12-01T18:59:59.999Z' });
    // Old record "1 Nov" stored as 2026-11-01T00:00Z (= 31 Oct 19:00 in Bogotá) belongs to November.
    const { fetchPage } = fakeApi([
      log('legacy', '2026-11-01T00:00:00.000Z'),
      log('oct', '2026-10-31T20:00:00.000Z'),
      log('dec', '2026-12-01T10:00:00.000Z'),
    ]);
    const cache = createHistoryCache({ fetchPage });
    await cache.load('2026-11');
    expect(cache.get('2026-11').items.map((l) => l._id)).toEqual(['legacy']);
  });
});

describe('history cache', () => {
  const data = [
    log('n1', '2026-11-08T23:00:00.000Z'),
    log('n2', '2026-11-02T23:00:00.000Z'),
    log('o1', '2026-10-20T23:00:00.000Z'),
  ];

  it('fetches only the requested month', async () => {
    const { fetchPage, calls } = fakeApi(data);
    const cache = createHistoryCache({ fetchPage });
    await cache.load('2026-11');
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject(fetchRange('2026-11'));
    expect(cache.get('2026-11').items.map((l) => l._id)).toEqual(['n1', 'n2']);
    expect(cache.loadedMonths()).toEqual(['2026-11']);
  });

  it('changing month loads that month; going back uses the cache', async () => {
    let t = 0;
    const { fetchPage } = fakeApi(data);
    const cache = createHistoryCache({ fetchPage, now: () => t });
    await cache.load('2026-11');
    await cache.load('2026-10');
    expect(cache.get('2026-10').items.map((l) => l._id)).toEqual(['o1']);
    t = 30_000;
    await cache.load('2026-11');
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it('refetches a stale month in the background, keeping the old data meanwhile', async () => {
    let t = 0;
    const { fetchPage } = fakeApi(data);
    const cache = createHistoryCache({ fetchPage, now: () => t, ttl: 1000 });
    await cache.load('2026-11');
    t = 5000;
    const p = cache.load('2026-11');
    expect(cache.get('2026-11').status).toBe('ready');
    await p;
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it('dedupes concurrent requests for the same month', async () => {
    const { fetchPage } = fakeApi(data);
    const cache = createHistoryCache({ fetchPage });
    await Promise.all([cache.load('2026-11'), cache.load('2026-11'), cache.load('2026-11')]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('paginates inside a month with the cursor', async () => {
    const many = Array.from({ length: PAGE_SIZE + 7 }, (_, i) => log(`s${i}`, `2026-09-${String(1 + (i % 28)).padStart(2, '0')}T18:00:${String(i % 60).padStart(2, '0')}.000Z`));
    const { fetchPage } = fakeApi(many);
    const cache = createHistoryCache({ fetchPage });
    await cache.load('2026-09');
    expect(cache.get('2026-09').items).toHaveLength(PAGE_SIZE);
    expect(cache.get('2026-09').nextCursor).not.toBeNull();
    await cache.loadMore('2026-09');
    expect(cache.get('2026-09').items).toHaveLength(PAGE_SIZE + 7);
    expect(cache.get('2026-09').nextCursor).toBeNull();
  });

  it('prefetches a neighbour only once', async () => {
    const { fetchPage } = fakeApi(data);
    const cache = createHistoryCache({ fetchPage });
    cache.prefetch('2026-10');
    cache.prefetch('2026-10');
    await cache.load('2026-10');
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('backend error → error state; retry recovers', async () => {
    let fail = true;
    const fetchPage = vi.fn(async () => {
      if (fail) throw new Error('Network Error');
      return { items: [log('n1', '2026-11-08T23:00:00.000Z')], nextCursor: null };
    });
    const cache = createHistoryCache({ fetchPage });
    await cache.load('2026-11');
    expect(cache.get('2026-11').status).toBe('error');
    fail = false;
    await cache.load('2026-11', { force: true });
    expect(cache.get('2026-11').status).toBe('ready');
  });

  it('mutations update cached months in place (upsert moves between months, patch, remove)', async () => {
    const { fetchPage } = fakeApi(data);
    const cache = createHistoryCache({ fetchPage });
    await cache.load('2026-11');
    await cache.load('2026-10');
    cache.upsert(log('n3', '2026-11-09T23:00:00.000Z'));
    expect(cache.get('2026-11').items[0]._id).toBe('n3');
    cache.upsert(log('n2', '2026-10-25T23:00:00.000Z')); // edited to another month
    expect(cache.get('2026-11').items.map((l) => l._id)).toEqual(['n3', 'n1']);
    expect(cache.get('2026-10').items.map((l) => l._id)).toEqual(['n2', 'o1']);
    cache.patch('n1', { favorite: true });
    expect(cache.get('2026-11').items.find((l) => l._id === 'n1').favorite).toBe(true);
    cache.remove('o1');
    expect(cache.get('2026-10').items.map((l) => l._id)).toEqual(['n2']);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });
});

describe('status helpers', () => {
  it('legacy sessions without status count as completed; open states', () => {
    expect(statusOf({})).toBe(WORKOUT_STATUS.COMPLETED);
    expect(isOpen({ status: 'paused' })).toBe(true);
    expect(isOpen({ status: 'in_progress' })).toBe(true);
    expect(isOpen({ status: 'cancelled' })).toBe(false);
    expect(isOpen({})).toBe(false);
  });
});
