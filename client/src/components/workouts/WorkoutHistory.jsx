import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LuActivity, LuPlus, LuHistory, LuFlame, LuMousePointerClick, LuTriangleAlert, LuRefreshCw } from 'react-icons/lu';
import HistoryToolbar from './HistoryToolbar';
import HistoryList from './HistoryList';
import SessionDetail from './SessionDetail';
import MonthCalendar from './MonthCalendar';
import {
  indexLogs, filterEntries, sortEntries, summarizeMonth, weeklyStreak, muscleGroupsOf,
  previousTopSets, monthKeyOf, dayKeyOf, shiftMonth, formatKg, formatMinutes,
} from './historyUtils';

const DEFAULT_FILTERS = { query: '', period: 'all', day: null, muscle: 'all', type: 'all', favorites: false, sort: 'recent' };
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

function LoadError({ onRetry }) {
  return (
    <div className="text-center py-16 px-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl" role="alert">
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

/*
 * Workout history as a tool: find fast → see the summary → open the detail.
 * Desktop: master-detail (filters + compact list on the left, detail on the
 * right, both with their own scroll). Mobile: the list, and the detail opens
 * full screen (the phone's back button closes it).
 */
function WorkoutHistory({ logs, status = 'ready', onRetry, onStart, onRepeat, onEdit, onDuplicate, onDelete, onToggleFavorite }) {
  const isDesktop = useIsDesktop();
  const entries = useMemo(() => indexLogs(logs), [logs]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => monthKeyOf(new Date()));
  const listScroll = useRef(null);

  const patchFilters = useCallback((patch) => setFilters((f) => ({ ...f, ...patch })), []);
  const clearFilters = useCallback(() => setFilters((f) => ({ ...DEFAULT_FILTERS, sort: f.sort })), []);
  const hasActiveFilters = Boolean(
    filters.query || filters.day || filters.period !== 'all' || filters.muscle !== 'all' || filters.type !== 'all' || filters.favorites
  );

  const results = useMemo(() => sortEntries(filterEntries(entries, filters), filters.sort), [entries, filters]);
  const grouped = filters.sort === 'recent' || filters.sort === 'oldest';
  const muscleOptions = useMemo(() => [...new Set(entries.flatMap((e) => muscleGroupsOf(e.log)))].sort(), [entries]);
  const streak = useMemo(() => weeklyStreak(entries), [entries]);
  const resultSummary = useMemo(() => summarizeMonth(results), [results]);

  const selected = useMemo(() => results.find((e) => e.log._id === selectedId) || null, [results, selectedId]);
  const previous = useMemo(() => (selected ? previousTopSets(entries, selected) : new Map()), [entries, selected]);

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

  /* ── Calendar (optional day picker) ── */
  const calendarEntries = useMemo(() => entries.filter((e) => e.monthKey === calendarMonth), [entries, calendarMonth]);
  const sessionsByDay = useMemo(() => {
    const map = new Map();
    for (const e of calendarEntries) map.set(e.dayKey, (map.get(e.dayKey) || 0) + 1);
    return map;
  }, [calendarEntries]);
  const oldestMonth = entries.length ? entries[entries.length - 1].monthKey : calendarMonth;
  const thisMonth = monthKeyOf(new Date());

  /* Actions that remove the session from the view also clear the selection. */
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

  if (status === 'error' && entries.length === 0) return <LoadError onRetry={onRetry} />;
  if (status !== 'loading' && entries.length === 0) return <EmptyHistory onStart={onStart} />;

  const detail = selected && (
    <SessionDetail
      entry={selected}
      previous={previous}
      onBack={isDesktop ? null : closeMobile}
      onRepeat={leaveAnd(onRepeat)}
      onEdit={leaveAnd(onEdit)}
      onDuplicate={leaveAnd(onDuplicate)}
      onDelete={handleDelete}
      onToggleFavorite={onToggleFavorite}
    />
  );

  return (
    <div className="lg:grid lg:grid-cols-[380px_minmax(0,1fr)] xl:grid-cols-[420px_minmax(0,1fr)] lg:gap-6">
      {/* ── Master: filters + compact list ── */}
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

          <HistoryToolbar
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
              monthKey={calendarMonth}
              sessionsByDay={sessionsByDay}
              summary={summarizeMonth(calendarEntries)}
              streak={streak}
              selectedDay={filters.day}
              todayKey={dayKeyOf(new Date())}
              canGoPrev={calendarMonth > oldestMonth}
              canGoNext={calendarMonth < thisMonth}
              onPrev={() => setCalendarMonth((m) => shiftMonth(m, -1))}
              onNext={() => setCalendarMonth((m) => shiftMonth(m, 1))}
              onSelectDay={(day) => patchFilters({ day })}
            />
          )}

          {status !== 'loading' && (
            <p className="text-xs text-zinc-400" aria-live="polite">
              <span className="font-bold text-zinc-200">{results.length}</span> {results.length === 1 ? 'sesión' : 'sesiones'}
              {results.length > 0 && (
                <span className="text-zinc-500">
                  {' '}· {formatMinutes(resultSummary.minutes)} · {formatKg(resultSummary.volume)}
                </span>
              )}
            </p>
          )}
          {status === 'error' && (
            <button type="button" onClick={onRetry} className="text-xs font-bold text-rose-300 flex items-center gap-1">
              <LuRefreshCw className="w-3.5 h-3.5" /> No se pudo actualizar. Reintentar
            </button>
          )}
        </div>

        <div ref={listScroll} className="lg:flex-1 lg:overflow-y-auto lg:px-2 lg:pb-2">
          <HistoryList
            entries={results}
            grouped={grouped}
            selectedId={selected?.log._id}
            onSelect={select}
            loading={status === 'loading' && entries.length === 0}
            onClearFilters={clearFilters}
            scrollRoot={isDesktop ? listScroll : null}
          />
        </div>
      </aside>

      {/* ── Detail: right panel on desktop ── */}
      {isDesktop && (
        <section className="lg:sticky lg:top-[82px] lg:h-[calc(100vh-100px)] lg:overflow-y-auto bg-[#0d0e12] border border-white/10 rounded-2xl p-6" aria-label="Detalle de la sesión">
          {detail || (
            <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 gap-3">
              <LuMousePointerClick className="w-8 h-8" aria-hidden="true" />
              <p className="text-sm">{status === 'loading' ? 'Cargando…' : 'Selecciona una sesión para ver su detalle'}</p>
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
