import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LuActivity, LuPlus, LuHistory, LuFlame, LuMousePointerClick, LuTriangleAlert, LuRefreshCw, LuPlay } from 'react-icons/lu';
import HistoryToolbar from './HistoryToolbar';
import HistoryList from './HistoryList';
import SessionDetail from './SessionDetail';
import MonthCalendar from './MonthCalendar';
import {
  indexLogs, filterEntries, sortEntries, summarizeMonth, weeklyStreakFromWeeks, muscleGroupsOf,
  monthKeyOf, dayKeyOf, shiftMonth, formatKg, formatMinutes, exerciseKey, topSet,
} from './historyUtils';
import { useMonthHistory, fetchLastSets } from './workoutsApi';
import { STATUS_META, statusOf } from './workoutStatus';
import { workoutDisplayDate } from './workoutUtils';

const DEFAULT_FILTERS = { query: '', day: null, muscle: 'all', type: 'all', favorites: false, status: 'all', sort: 'recent' };
const DESKTOP_QUERY = '(min-width: 1024px)';

function useIsDesktop() {
  const [is, setIs] = useState(() => typeof window !== 'undefined' && window.matchMedia(DESKTOP_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const on = () => setIs(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return is;
}

function EmptyHistory({ onStart }) {
  return (
    <div className="text-center py-20 space-y-5 animate-fadeInUp">
      <div className="w-20 h-20 rounded-3xl bg-zinc-900 border border-white/10 flex items-center justify-center mx-auto text-lime-400">
        <LuActivity className="w-10 h-10" />
      </div>
      <div>
        <h3 className="text-xl font-bold text-white">Sin entrenamientos aún</h3>
        <p className="text-zinc-400 text-sm mt-1 max-w-sm mx-auto">
          Inicia tu primera sesión hoy y lleva el conteo exacto de series, peso y repeticiones.
        </p>
      </div>
      <button
        type="button"
        onClick={onStart}
        className="px-6 py-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-zinc-950 font-bold text-sm transition-all inline-flex items-center gap-2"
      >
        <LuPlus className="w-4 h-4" /> Comenzar mi primer entreno
      </button>
    </div>
  );
}

function LoadError({ onRetry, compact = false }) {
  return (
    <div className={`text-center px-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl ${compact ? 'py-8' : 'py-16'}`} role="alert">
      <LuTriangleAlert className="w-8 h-8 text-rose-400 mx-auto mb-3" aria-hidden="true" />
      <p className="text-sm font-semibold text-white">No pudimos cargar tu historial</p>
      <p className="text-xs text-zinc-400 mt-1">Revisa tu conexión. Si el servidor estaba en reposo puede tardar unos segundos.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 h-9 px-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-sm font-bold text-white inline-flex items-center gap-2"
      >
        <LuRefreshCw className="w-4 h-4" /> Reintentar
      </button>
    </div>
  );
}

/* Unfinished sessions (from the summary) with a direct "Reanudar". */
function OpenSessionsBanner({ open, onResume, resumingId }) {
  if (!open?.length) return null;
  return (
    <ul className="space-y-1.5" aria-label="Sesiones sin terminar">
      {open.slice(0, 2).map((s) => {
        const when = workoutDisplayDate(s.startedAt || s.date);
        return (
          <li key={s._id} className="flex items-center gap-2.5 rounded-xl border border-sky-400/20 bg-sky-400/5 px-3 py-2">
            <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded border ${STATUS_META[statusOf(s)].badge}`}>
              {STATUS_META[statusOf(s)].label}
            </span>
            <span className="flex-1 min-w-0 truncate text-xs text-zinc-300">
              Sesión del {when.toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
            <button
              type="button"
              onClick={() => onResume(s)}
              disabled={resumingId === s._id}
              className="shrink-0 h-8 px-3 rounded-lg bg-lime-400 hover:bg-lime-300 disabled:opacity-60 text-zinc-950 text-xs font-black flex items-center gap-1"
            >
              <LuPlay className="w-3 h-3 fill-zinc-950" /> {resumingId === s._id ? 'Abriendo…' : 'Reanudar'}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* exerciseKey → top set of the latest finished session before this one (asked to the server). */
function usePreviousTopSets(log) {
  const [state, setState] = useState({ id: null, map: new Map() });
  useEffect(() => {
    if (!log) return undefined;
    let alive = true;
    const ids = (log.exercises || []).map(exerciseKey).filter(Boolean);
    fetchLastSets(ids, { before: log.date, exclude: log._id })
      .then((data) => {
        if (!alive) return;
        const map = new Map();
        for (const [id, v] of Object.entries(data || {})) map.set(id, { ...topSet(v.sets), date: v.date });
        setState({ id: log._id, map });
      })
      .catch(() => alive && setState({ id: log._id, map: new Map() }));
    return () => { alive = false; };
  }, [log]);
  // While loading a new session's comparison, show none rather than the old one.
  return { previous: state.id === log?._id ? state.map : new Map(), ready: state.id === log?._id };
}

/*
 * Workout history, one month at a time: the month is fetched from the server
 * (date range + cursor pages, cached per month); search and filters apply to it.
 * Totals, streak, month counts and unfinished sessions come from the small
 * summary endpoint, so the full history is never downloaded.
 * Desktop: master-detail. Mobile: the list, and the detail opens full screen.
 */
function WorkoutHistory({
  cache, summary, onStart, onRepeat, onResume, resumingId, onEdit, onDuplicate, onDelete, onToggleFavorite,
}) {
  const isDesktop = useIsDesktop();
  const thisMonth = monthKeyOf(new Date());
  const summaryMonths = summary.data?.months || [];

  // Start on the latest month that has sessions (or the current one).
  const [month, setMonth] = useState(null);
  useEffect(() => {
    if (month || summary.status === 'loading') return;
    setMonth(summaryMonths[0]?.month && summaryMonths[0].month <= thisMonth ? summaryMonths[0].month : thisMonth);
  }, [month, summary.status, summaryMonths, thisMonth]);
  const activeMonth = month || thisMonth;

  const page = useMonthHistory(cache, activeMonth, { enabled: Boolean(month) });
  const entries = useMemo(() => indexLogs(page.items), [page.items]);

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const listScroll = useRef(null);

  const patchFilters = useCallback((patch) => setFilters((f) => ({ ...f, ...patch })), []);
  const clearFilters = useCallback(() => setFilters((f) => ({ ...DEFAULT_FILTERS, sort: f.sort })), []);
  const hasActiveFilters = Boolean(
    filters.query || filters.day || filters.muscle !== 'all' || filters.type !== 'all' || filters.favorites || filters.status !== 'all'
  );

  const results = useMemo(() => sortEntries(filterEntries(entries, filters), filters.sort), [entries, filters]);
  const grouped = filters.sort === 'recent' || filters.sort === 'oldest';
  const muscleOptions = useMemo(() => [...new Set(entries.flatMap((e) => muscleGroupsOf(e.log)))].sort(), [entries]);
  const streak = useMemo(() => weeklyStreakFromWeeks(summary.data?.weeks), [summary.data]);
  const resultSummary = useMemo(() => summarizeMonth(results), [results]);

  const selected = useMemo(() => results.find((e) => e.log._id === selectedId) || null, [results, selectedId]);
  const { previous, ready: previousReady } = usePreviousTopSets(selected?.log || null);

  /* ── Month navigation (bounded by the oldest month with sessions and today) ── */
  const oldestMonth = summaryMonths.length ? summaryMonths[summaryMonths.length - 1].month : activeMonth;
  const monthCount = summaryMonths.find((m) => m.month === activeMonth)?.count ?? (page.status === 'ready' && !page.hasMore ? entries.length : null);
  const goMonth = useCallback((delta) => {
    setMonth((m) => shiftMonth(m || thisMonth, delta));
    setFilters((f) => ({ ...f, day: null }));
    setSelectedId(null);
  }, [thisMonth]);

  // Desktop always shows something on the right: keep the first result selected.
  useEffect(() => {
    if (isDesktop && !selected && results.length > 0) setSelectedId(results[0].log._id);
  }, [isDesktop, selected, results]);

  /* ── Mobile detail: full screen, closable with the system back button ── */
  const mobileOpen = !isDesktop && Boolean(selected);
  const select = useCallback((id) => {
    setSelectedId(id);
    if (!window.matchMedia(DESKTOP_QUERY).matches) window.history.pushState({ historyDetail: true }, '');
  }, []);
  const closeMobile = useCallback(() => {
    if (window.history.state?.historyDetail) window.history.back();
    else setSelectedId(null);
  }, []);
  useEffect(() => {
    const onPop = () => { if (!window.matchMedia(DESKTOP_QUERY).matches) setSelectedId(null); };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  useEffect(() => {
    if (!mobileOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && closeMobile();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [mobileOpen, closeMobile]);

  /* ── Calendar of the loaded month (optional day picker) ── */
  const sessionsByDay = useMemo(() => {
    const map = new Map();
    for (const e of entries) map.set(e.dayKey, (map.get(e.dayKey) || 0) + 1);
    return map;
  }, [entries]);

  /* Actions that take the session out of the view also clear the selection. */
  const handleDelete = useCallback((log) => {
    if (log._id === selectedId) {
      if (window.history.state?.historyDetail) window.history.back();
      setSelectedId(null);
    }
    onDelete(log);
  }, [onDelete, selectedId]);
  const leaveAnd = useCallback((fn) => (log) => {
    if (window.history.state?.historyDetail) window.history.back();
    setSelectedId(null);
    fn(log);
  }, []);

  const firstLoad = page.status === 'loading' || page.status === 'idle' || !month;
  const noHistory = summary.status === 'ready' && summaryMonths.length === 0 && page.status === 'ready' && entries.length === 0;
  if (summary.status === 'error' && page.status === 'error') return <LoadError onRetry={() => { summary.refresh(); page.retry(); }} />;
  if (noHistory) return <EmptyHistory onStart={onStart} />;

  const detail = selected && (
    <SessionDetail
      entry={selected}
      previous={previous}
      previousReady={previousReady}
      onBack={isDesktop ? null : closeMobile}
      onRepeat={leaveAnd(onRepeat)}
      onResume={leaveAnd(onResume)}
      resuming={resumingId === selected.log._id}
      onEdit={leaveAnd(onEdit)}
      onDuplicate={leaveAnd(onDuplicate)}
      onDelete={handleDelete}
      onToggleFavorite={onToggleFavorite}
    />
  );

  return (
    <div className="lg:grid lg:grid-cols-[380px_minmax(0,1fr)] xl:grid-cols-[420px_minmax(0,1fr)] lg:gap-6">
      {/* ── Master: month, filters + compact list ── */}
      <aside
        className="flex flex-col lg:sticky lg:top-[82px] lg:h-[calc(100vh-100px)] lg:bg-[#0d0e12] lg:border lg:border-white/10 lg:rounded-2xl lg:overflow-hidden"
        aria-label="Historial de sesiones"
      >
        <div className="lg:p-4 space-y-3 pb-3 lg:border-b lg:border-white/5">
          <div className="flex items-center gap-2">
            <LuHistory className="w-4 h-4 text-lime-400" aria-hidden="true" />
            <h2 className="text-sm font-black uppercase tracking-wider text-zinc-200">Historial</h2>
            {streak > 0 && (
              <span className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-orange-300 bg-orange-400/10 border border-orange-400/20 rounded-full px-2 py-0.5" title="Semanas seguidas entrenando">
                <LuFlame className="w-3.5 h-3.5" aria-hidden="true" /> {streak} {streak === 1 ? 'semana' : 'semanas'}
              </span>
            )}
          </div>

          <OpenSessionsBanner open={summary.data?.open} onResume={onResume} resumingId={resumingId} />

          <HistoryToolbar
            month={activeMonth}
            monthCount={monthCount}
            canPrev={activeMonth > oldestMonth}
            canNext={activeMonth < thisMonth}
            onPrevMonth={() => goMonth(-1)}
            onNextMonth={() => goMonth(1)}
            filters={filters}
            onChange={patchFilters}
            onClear={clearFilters}
            hasActiveFilters={hasActiveFilters}
            muscleOptions={muscleOptions}
            calendarOpen={calendarOpen}
            onToggleCalendar={() => setCalendarOpen((o) => !o)}
          />

          {calendarOpen && (
            <MonthCalendar
              monthKey={activeMonth}
              sessionsByDay={sessionsByDay}
              summary={summarizeMonth(entries)}
              streak={streak}
              selectedDay={filters.day}
              todayKey={dayKeyOf(new Date())}
              canGoPrev={activeMonth > oldestMonth}
              canGoNext={activeMonth < thisMonth}
              onPrev={() => goMonth(-1)}
              onNext={() => goMonth(1)}
              onSelectDay={(day) => patchFilters({ day })}
            />
          )}

          {page.status === 'ready' && (
            <p className="text-xs text-zinc-400" aria-live="polite">
              <span className="font-bold text-zinc-200">{results.length}</span> {results.length === 1 ? 'sesión' : 'sesiones'}
              {page.hasMore && <span className="text-zinc-500"> cargadas</span>}
              {results.length > 0 && (
                <span className="text-zinc-500">
                  {' '}· {formatMinutes(resultSummary.minutes)} · {formatKg(resultSummary.volume)}
                </span>
              )}
            </p>
          )}
          {page.status === 'ready' && page.error && (
            <button type="button" onClick={page.retry} className="text-xs font-bold text-rose-300 flex items-center gap-1">
              <LuRefreshCw className="w-3.5 h-3.5" /> No se pudo actualizar. Reintentar
            </button>
          )}
        </div>

        <div ref={listScroll} className="lg:flex-1 lg:overflow-y-auto lg:px-2 lg:pb-2">
          {page.status === 'error' ? (
            <div className="lg:pt-2"><LoadError compact onRetry={page.retry} /></div>
          ) : page.status === 'ready' && entries.length === 0 ? (
            <div className="text-center py-12 px-4 text-sm text-zinc-500">No entrenaste este mes.</div>
          ) : (
            <HistoryList
              entries={results}
              grouped={grouped}
              selectedId={selected?.log._id}
              onSelect={select}
              loading={firstLoad}
              onClearFilters={clearFilters}
              scrollRoot={isDesktop ? listScroll : null}
              hasMore={page.hasMore}
              loadingMore={page.loadingMore}
              onLoadMore={page.loadMore}
            />
          )}
        </div>
      </aside>

      {/* ── Detail: right panel on desktop ── */}
      {isDesktop && (
        <section className="lg:sticky lg:top-[82px] lg:h-[calc(100vh-100px)] lg:overflow-y-auto bg-[#0d0e12] border border-white/10 rounded-2xl p-6" aria-label="Detalle de la sesión">
          {detail || (
            <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 gap-3">
              <LuMousePointerClick className="w-8 h-8" aria-hidden="true" />
              <p className="text-sm">{firstLoad ? 'Cargando…' : 'Selecciona una sesión para ver su detalle'}</p>
            </div>
          )}
        </section>
      )}

      {/* ── Detail: full screen on mobile/tablet ── */}
      {mobileOpen && (
        <div role="dialog" aria-modal="true" aria-label="Detalle de la sesión" className="fixed inset-0 z-[60] bg-[#08090D] overflow-y-auto animate-fadeIn">
          <div className="max-w-3xl mx-auto px-4 py-4 pb-24">{detail}</div>
        </div>
      )}
    </div>
  );
}

export default memo(WorkoutHistory);
