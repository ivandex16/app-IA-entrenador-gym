import { memo } from 'react';
import { LuSearch, LuX, LuStar, LuCalendarDays, LuArrowDownUp, LuFilterX, LuChevronLeft, LuChevronRight } from 'react-icons/lu';
import { SORTS, MUSCLE_LABELS, monthLabel } from './historyUtils';
import { WORKOUT_STATUS, STATUS_META } from './workoutStatus';

const selectClass =
  'h-9 bg-zinc-900 border border-white/10 rounded-lg px-2.5 text-xs font-semibold text-zinc-200 outline-none focus:border-lime-400/60 cursor-pointer';

const navBtn =
  'w-9 h-9 shrink-0 rounded-xl bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition disabled:opacity-30 disabled:pointer-events-none';

/*
 * Month navigator (each month is loaded from the server on demand) + search,
 * filters and sort applied to that month. Fully controlled.
 */
function HistoryToolbar({
  month, monthCount, canPrev, canNext, onPrevMonth, onNextMonth,
  filters, onChange, onClear, hasActiveFilters, muscleOptions, calendarOpen, onToggleCalendar,
}) {
  const set = (patch) => onChange(patch);

  return (
    <div className="space-y-2.5">
      {/* Month navigation */}
      <div className="flex items-center gap-2">
        <button type="button" onClick={onPrevMonth} disabled={!canPrev} className={navBtn} aria-label="Mes anterior">
          <LuChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 text-center min-w-0" aria-live="polite">
          <p className="text-sm font-black text-white truncate">{monthLabel(month)}</p>
          {monthCount != null && (
            <p className="text-[11px] text-zinc-500">{monthCount} {monthCount === 1 ? 'sesión' : 'sesiones'}</p>
          )}
        </div>
        <button type="button" onClick={onNextMonth} disabled={!canNext} className={navBtn} aria-label="Mes siguiente">
          <LuChevronRight className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onToggleCalendar}
          aria-pressed={calendarOpen}
          title="Elegir un día en el calendario"
          aria-label="Calendario"
          className={`${navBtn} ${calendarOpen || filters.day ? '!bg-lime-400/15 !border-lime-400/40 !text-lime-300' : ''}`}
        >
          <LuCalendarDays className="w-4 h-4" />
        </button>
      </div>

      {/* Search (within the month) */}
      <div className="relative">
        <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" aria-hidden="true" />
        <input
          type="search"
          value={filters.query}
          onChange={(e) => set({ query: e.target.value })}
          placeholder="Buscar en este mes: rutina, ejercicio, músculo"
          aria-label="Buscar en el mes"
          className="w-full h-10 pl-9 pr-9 bg-zinc-900 border border-white/10 rounded-xl text-sm text-white placeholder-zinc-500 outline-none focus:border-lime-400/60 focus:ring-2 focus:ring-lime-400/15 [&::-webkit-search-cancel-button]:hidden"
        />
        {filters.query && (
          <button
            type="button"
            onClick={() => set({ query: '' })}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 flex items-center justify-center"
            aria-label="Borrar búsqueda"
          >
            <LuX className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filters + sort */}
      <div className="flex flex-wrap items-center gap-2">
        <select className={selectClass} value={filters.status} onChange={(e) => set({ status: e.target.value })} aria-label="Estado">
          <option value="all">Todos los estados</option>
          {Object.values(WORKOUT_STATUS).map((s) => (
            <option key={s} value={s}>{STATUS_META[s].label}</option>
          ))}
        </select>
        <select className={selectClass} value={filters.muscle} onChange={(e) => set({ muscle: e.target.value })} aria-label="Grupo muscular">
          <option value="all">Todos los músculos</option>
          {muscleOptions.map((g) => (
            <option key={g} value={g}>{MUSCLE_LABELS[g] || g}</option>
          ))}
        </select>
        <select className={selectClass} value={filters.type} onChange={(e) => set({ type: e.target.value })} aria-label="Tipo de entrenamiento">
          <option value="all">Todos los tipos</option>
          <option value="routine">De rutina</option>
          <option value="free">Libre</option>
        </select>
        <button
          type="button"
          onClick={() => set({ favorites: !filters.favorites })}
          aria-pressed={filters.favorites}
          className={`h-9 px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition ${
            filters.favorites ? 'bg-amber-400/15 border-amber-400/40 text-amber-300' : 'bg-zinc-900 border-white/10 text-zinc-300 hover:text-white'
          }`}
        >
          <LuStar className={`w-3.5 h-3.5 ${filters.favorites ? 'fill-amber-300' : ''}`} /> Favoritas
        </button>
        <label className="ml-auto flex items-center gap-1.5 text-xs text-zinc-400">
          <LuArrowDownUp className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="sr-only">Ordenar por</span>
          <select className={selectClass} value={filters.sort} onChange={(e) => set({ sort: e.target.value })}>
            {Object.entries(SORTS).map(([v, s]) => (
              <option key={v} value={v}>{s.label}</option>
            ))}
          </select>
        </label>
      </div>

      {hasActiveFilters && (
        <button type="button" onClick={onClear} className="text-xs font-bold text-lime-400 hover:text-lime-300 flex items-center gap-1">
          <LuFilterX className="w-3.5 h-3.5" /> Quitar filtros
        </button>
      )}
    </div>
  );
}

export default memo(HistoryToolbar);
