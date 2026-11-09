/*
 * Month-by-month cache of workout sessions (no extra library).
 *
 * - Each month ("2026-11") is fetched on demand with the API's date filter and
 *   cursor pagination (PAGE_SIZE per request), never the whole history.
 * - Concurrent requests for the same month are deduplicated.
 * - A month is reused while fresh (TTL); after that it's shown immediately and
 *   refreshed in the background (stale-while-revalidate).
 * - Mutations (save, edit, favorite, delete) update the cached months in place,
 *   so the UI doesn't refetch after every action.
 *
 * `fetchPage({ from, to, limit, cursor })` must resolve to { items, nextCursor }.
 */
import { monthKeyOf } from './historyUtils';
import { workoutDisplayDate } from './workoutUtils';

export const PAGE_SIZE = 50;
export const TTL_MS = 2 * 60 * 1000;

/* Local month → ISO instants [first ms, last ms]. */
export function monthRange(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  const from = new Date(y, m - 1, 1, 0, 0, 0, 0);
  const to = new Date(y, m, 1, 0, 0, 0, 0);
  to.setMilliseconds(-1);
  return { from: from.toISOString(), to: to.toISOString() };
}

export const monthOfLog = (log) => monthKeyOf(workoutDisplayDate(log.date));

/* Old sessions were stored as UTC midnight of their calendar day, which can fall
   a few hours outside the local month bounds. The request is widened by the
   largest timezone offset and the result is trimmed to the month on the client. */
const LEGACY_PAD_MS = 14 * 60 * 60 * 1000;
export function fetchRange(monthKey) {
  const { from, to } = monthRange(monthKey);
  return {
    from: new Date(Date.parse(from) - LEGACY_PAD_MS).toISOString(),
    to: new Date(Date.parse(to) + LEGACY_PAD_MS).toISOString(),
  };
}
const inMonth = (key) => (log) => monthOfLog(log) === key;

const byDateDesc = (a, b) => new Date(b.date) - new Date(a.date) || String(b._id).localeCompare(String(a._id));

export function createHistoryCache({ fetchPage, now = () => Date.now(), ttl = TTL_MS }) {
  const months = new Map(); // key → { items, nextCursor, status, error, fetchedAt, promise }
  const listeners = new Set();
  const emit = () => listeners.forEach((fn) => fn());

  const entry = (key) => {
    if (!months.has(key)) months.set(key, { items: [], nextCursor: null, status: 'idle', error: null, fetchedAt: 0, promise: null });
    return months.get(key);
  };

  function load(key, { force = false } = {}) {
    const e = entry(key);
    if (e.promise) return e.promise; // dedupe
    const fresh = e.status === 'ready' && now() - e.fetchedAt < ttl;
    if (fresh && !force) return Promise.resolve(e);
    const background = e.status === 'ready';
    if (!background) { e.status = 'loading'; e.error = null; emit(); }
    e.promise = fetchPage({ ...fetchRange(key), limit: PAGE_SIZE })
      .then(({ items, nextCursor }) => {
        Object.assign(e, { items: items.filter(inMonth(key)).sort(byDateDesc), nextCursor, status: 'ready', error: null, fetchedAt: now() });
      })
      .catch((error) => {
        // A failed background refresh keeps the data we had.
        if (background) e.error = error;
        else Object.assign(e, { status: 'error', error });
      })
      .finally(() => { e.promise = null; emit(); });
    return e.promise;
  }

  function loadMore(key) {
    const e = entry(key);
    if (!e.nextCursor || e.promise) return e.promise || Promise.resolve(e);
    e.loadingMore = true;
    emit();
    e.promise = fetchPage({ ...fetchRange(key), limit: PAGE_SIZE, cursor: e.nextCursor })
      .then(({ items, nextCursor }) => {
        const ids = new Set(e.items.map((l) => l._id));
        e.items = [...e.items, ...items.filter((l) => !ids.has(l._id) && inMonth(key)(l))].sort(byDateDesc);
        e.nextCursor = nextCursor;
      })
      .catch((error) => { e.error = error; })
      .finally(() => { e.promise = null; e.loadingMore = false; emit(); });
    return e.promise;
  }

  /* Background fetch of a neighbour month, only if never loaded. */
  function prefetch(key) {
    const e = entry(key);
    if (e.status === 'idle') load(key).catch(() => {});
  }

  /* Insert or replace a session in the month it belongs to (and only there). */
  function upsert(log) {
    const target = monthOfLog(log);
    for (const [key, e] of months) {
      if (key !== target && e.items.some((l) => l._id === log._id)) e.items = e.items.filter((l) => l._id !== log._id);
    }
    const e = months.get(target);
    if (e && e.status === 'ready') {
      e.items = [...e.items.filter((l) => l._id !== log._id), log].sort(byDateDesc);
    }
    emit();
  }

  function patch(id, changes) {
    for (const e of months.values()) e.items = e.items.map((l) => (l._id === id ? { ...l, ...changes } : l));
    emit();
  }

  function remove(id) {
    for (const e of months.values()) e.items = e.items.filter((l) => l._id !== id);
    emit();
  }

  function invalidate(key) {
    const e = months.get(key);
    if (e) e.fetchedAt = 0;
  }

  return {
    get: (key) => entry(key),
    load,
    loadMore,
    prefetch,
    upsert,
    patch,
    remove,
    invalidate,
    subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    /* For tests/diagnostics. */
    loadedMonths: () => [...months.entries()].filter(([, e]) => e.status !== 'idle').map(([k]) => k),
  };
}
