import { memo, useEffect, useRef, useState } from 'react';
import { LuStar, LuChevronRight, LuSearchX } from 'react-icons/lu';
import { sessionTitle, muscleGroupsOf, MUSCLE_LABELS, groupByMonth, monthLabel, formatMinutes } from './historyUtils';
import { statusOf, STATUS_META, WORKOUT_STATUS } from './workoutStatus';

const PAGE = 30; // rows rendered per step; more appear as the user nears the end

/* One compact row: only what's needed to recognise a session. */
const SessionListItem = memo(function SessionListItem({ entry, selected, onSelect }) {
  const { log, date } = entry;
  const muscles = muscleGroupsOf(log).slice(0, 3).map((g) => MUSCLE_LABELS[g] || g);
  const count = log.exercises?.length || 0;
  const meta = [`${count} ${count === 1 ? 'ejercicio' : 'ejercicios'}`, log.durationMinutes > 0 && formatMinutes(log.durationMinutes)]
    .filter(Boolean)
    .join(' · ');

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(log._id)}
        aria-current={selected ? 'true' : undefined}
        className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left border transition ${
          selected ? 'bg-lime-400/10 border-lime-400/40' : 'border-transparent hover:bg-white/[0.04]'
        }`}
      >
        <div className={`w-11 h-11 shrink-0 rounded-xl flex flex-col items-center justify-center border ${selected ? 'border-lime-400/40 bg-lime-400/10' : 'border-white/10 bg-zinc-900'}`}>
          <span className="text-base font-black text-white leading-none font-mono">{date.getDate()}</span>
          <span className="text-[9px] font-bold uppercase text-zinc-400 mt-0.5">
            {date.toLocaleDateString('es', { weekday: 'short' }).replace('.', '')}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-bold text-white">
            <span className="truncate">{sessionTitle(log)}</span>
            {log.favorite && <LuStar className="w-3.5 h-3.5 shrink-0 text-amber-300 fill-amber-300" aria-label="Favorita" />}
            {statusOf(log) !== WORKOUT_STATUS.COMPLETED && (
              <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded border ${STATUS_META[statusOf(log)].badge}`}>
                {STATUS_META[statusOf(log)].label}
              </span>
            )}
          </p>
          <p className="text-xs text-zinc-400 truncate">
            {meta}
            {muscles.length > 0 && <span className="text-zinc-500"> · {muscles.join(' · ')}</span>}
          </p>
        </div>
        <LuChevronRight className={`w-4 h-4 shrink-0 transition ${selected ? 'text-lime-400' : 'text-zinc-600 group-hover:text-zinc-300'}`} aria-hidden="true" />
      </button>
    </li>
  );
});

function SkeletonRows() {
  return (
    <ul className="space-y-1.5" aria-label="Cargando historial" aria-busy="true">
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i} className="flex items-center gap-3 px-3 py-2.5">
          <div className="w-11 h-11 rounded-xl bg-zinc-800/80 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/3 rounded bg-zinc-800/80 animate-pulse" />
            <div className="h-2.5 w-1/2 rounded bg-zinc-800/60 animate-pulse" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/*
 * Compact list grouped by month (sticky month headers). Renders PAGE rows at a
 * time and adds more when the sentinel at the bottom comes into view, so even
 * hundreds of sessions stay fast.
 */
function HistoryList({ entries, grouped, selectedId, onSelect, loading, onClearFilters, scrollRoot, hasMore, loadingMore, onLoadMore }) {
  const [limit, setLimit] = useState(PAGE);
  const sentinel = useRef(null);

  // New result set (filters/sort changed) → start again from the top chunk.
  useEffect(() => setLimit(PAGE), [entries]);

  // Keep the selected row rendered even if it's beyond the current chunk.
  useEffect(() => {
    const i = entries.findIndex((e) => e.log._id === selectedId);
    if (i >= limit) setLimit(Math.ceil((i + 1) / PAGE) * PAGE);
  }, [selectedId, entries, limit]);

  // Near the end: first reveal the next rendered chunk; once everything loaded is
  // shown, ask the server for the next page of this month (cursor).
  const moreRendered = limit < entries.length;
  const canGrow = moreRendered || (hasMore && !loadingMore);
  useEffect(() => {
    if (!sentinel.current || !canGrow) return undefined;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        if (moreRendered) setLimit((l) => l + PAGE);
        else onLoadMore?.();
      },
      { root: scrollRoot?.current || null, rootMargin: '400px' }
    );
    io.observe(sentinel.current);
    return () => io.disconnect();
  }, [canGrow, moreRendered, onLoadMore, scrollRoot]);

  if (loading) return <SkeletonRows />;

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <LuSearchX className="w-8 h-8 text-zinc-600 mx-auto mb-3" aria-hidden="true" />
        <p className="text-sm font-semibold text-zinc-200">Ninguna sesión coincide</p>
        <p className="text-xs text-zinc-500 mt-1">Prueba con otra búsqueda o quita algún filtro.</p>
        <button type="button" onClick={onClearFilters} className="mt-4 text-xs font-bold text-lime-400 hover:text-lime-300">
          Quitar filtros
        </button>
      </div>
    );
  }

  const shown = entries.slice(0, limit);
  const sections = grouped ? groupByMonth(shown) : [{ monthKey: null, items: shown }];

  return (
    <div>
      {sections.map((section) => (
        <section key={section.monthKey || 'all'} aria-label={section.monthKey ? monthLabel(section.monthKey) : 'Sesiones'}>
          {section.monthKey && (
            <h3 className="sticky top-[66px] xl:top-0 z-10 bg-[#0d0e12]/95 backdrop-blur px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-zinc-400 border-b border-white/5">
              {monthLabel(section.monthKey)}
              <span className="ml-2 font-mono font-semibold text-zinc-600 normal-case">{section.items.length}</span>
            </h3>
          )}
          <ul className="space-y-0.5 py-1">
            {section.items.map((entry) => (
              <SessionListItem key={entry.log._id} entry={entry} selected={entry.log._id === selectedId} onSelect={onSelect} />
            ))}
          </ul>
        </section>
      ))}
      {(moreRendered || hasMore) && (
        <div ref={sentinel} className="py-3 text-center">
          {loadingMore ? (
            <span className="text-xs text-zinc-500">Cargando más sesiones…</span>
          ) : (
            <button
              type="button"
              onClick={() => (moreRendered ? setLimit((l) => l + PAGE) : onLoadMore?.())}
              className="text-xs font-bold text-zinc-400 hover:text-white"
            >
              {moreRendered ? `Mostrar más (${entries.length - limit})` : 'Cargar más sesiones de este mes'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default memo(HistoryList);
