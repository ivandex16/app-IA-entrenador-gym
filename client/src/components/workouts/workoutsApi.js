/*
 * Data access for workout history: per-user month cache, whole-history summary
 * and "last time" sets, all on demand (the full history is never downloaded).
 */
import { useCallback, useEffect, useReducer, useState } from 'react';
import api from '../../api/axios';
import { createHistoryCache } from './historyCache';
import { shiftMonth, monthKeyOf } from './historyUtils';

const caches = new Map(); // userId → cache (survives navigation, dropped on logout/reload)

export function getHistoryCache(userId = 'anon') {
  if (!caches.has(userId)) {
    caches.set(
      userId,
      createHistoryCache({
        // A server without pagination answers with a plain array (e.g. during a deploy).
        fetchPage: (params) =>
          api.get('/workouts', { params }).then((r) => (Array.isArray(r.data) ? { items: r.data, nextCursor: null } : r.data)),
      })
    );
  }
  return caches.get(userId);
}

/* Sessions of one month + loading state; prefetches the neighbour months. */
export function useMonthHistory(cache, monthKey, { prefetchNeighbours = true, enabled = true } = {}) {
  const [, rerender] = useReducer((n) => n + 1, 0);
  useEffect(() => cache.subscribe(rerender), [cache]);

  useEffect(() => {
    if (!enabled) return undefined;
    let alive = true;
    cache.load(monthKey).then(() => {
      if (!alive || !prefetchNeighbours) return;
      // Only after the visible month is in: previous month, and next if it isn't the future.
      cache.prefetch(shiftMonth(monthKey, -1));
      const next = shiftMonth(monthKey, 1);
      if (next <= monthKeyOf(new Date())) cache.prefetch(next);
    });
    return () => { alive = false; };
  }, [cache, monthKey, prefetchNeighbours, enabled]);

  const loadMore = useCallback(() => cache.loadMore(monthKey), [cache, monthKey]);
  const retry = useCallback(() => cache.load(monthKey, { force: true }), [cache, monthKey]);
  const e = cache.get(monthKey);
  return {
    items: e.items,
    status: e.status,
    error: e.error,
    hasMore: Boolean(e.nextCursor),
    loadingMore: Boolean(e.loadingMore),
    loadMore,
    retry,
  };
}

const TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

/* Totals, months with sessions, weeks for the streak and open sessions. */
export function useHistorySummary(userId) {
  const [state, setState] = useState({ data: null, status: 'loading' });
  const refresh = useCallback(() => {
    return api
      .get('/workouts/summary', { params: { tz: TIME_ZONE } })
      .then((r) => setState({ data: r.data, status: 'ready' }))
      .catch(() => setState((s) => ({ ...s, status: s.data ? 'ready' : 'error' })));
  }, []);
  useEffect(() => { refresh(); }, [refresh, userId]);
  return { ...state, refresh };
}

const lastSetsCache = new Map();

/* For each exercise id, the sets of the latest finished session before `before`. */
export function fetchLastSets(exerciseIds, { before, exclude } = {}) {
  const ids = [...new Set(exerciseIds.filter(Boolean).map(String))].sort();
  if (ids.length === 0) return Promise.resolve({});
  const key = `${ids.join(',')}|${before || ''}|${exclude || ''}`;
  if (!lastSetsCache.has(key)) {
    const p = api
      .get('/workouts/last-sets', { params: { exercises: ids.join(','), before, exclude } })
      .then((r) => r.data)
      .catch((err) => { lastSetsCache.delete(key); throw err; });
    lastSetsCache.set(key, p);
  }
  return lastSetsCache.get(key);
}

export const clearLastSetsCache = () => lastSetsCache.clear();
