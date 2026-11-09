import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LuActivity, LuPlus, LuHistory, LuX } from 'react-icons/lu';
import MonthCalendar from './MonthCalendar';
import SessionRow from './SessionRow';
import { indexLogs, summarizeMonth, weeklyStreak, monthKeyOf, dayKeyOf, shiftMonth, monthLabel } from './historyUtils';

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

/*
 * History organised by month: a calendar of the selected month (summary,
 * weekly streak, trained days) and, below, only that month's sessions as
 * compact rows that expand to show the detail. Picking a day narrows the
 * list to that day. The list never grows beyond one month.
 */
function WorkoutHistory({ logs, onStart }) {
  const entries = useMemo(() => indexLogs(logs), [logs]);
  const todayKey = dayKeyOf(new Date());
  const currentMonth = monthKeyOf(new Date());
  const oldestMonth = entries.length ? entries[entries.length - 1].monthKey : currentMonth;
  const newestMonth = entries.length && entries[0].monthKey > currentMonth ? entries[0].monthKey : currentMonth;

  // Opens on the month of the latest session (or the current one).
  const [month, setMonth] = useState(() => (entries[0]?.monthKey ?? currentMonth));
  const [day, setDay] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  // Logs usually arrive after the first render: jump once to the latest session's month.
  const positioned = useRef(entries.length > 0);
  useEffect(() => {
    if (!positioned.current && entries.length > 0) {
      positioned.current = true;
      setMonth(entries[0].monthKey);
    }
  }, [entries]);

  const monthEntries = useMemo(() => entries.filter((e) => e.monthKey === month), [entries, month]);
  const sessionsByDay = useMemo(() => {
    const map = new Map();
    for (const e of monthEntries) map.set(e.dayKey, (map.get(e.dayKey) || 0) + 1);
    return map;
  }, [monthEntries]);
  const summary = useMemo(() => summarizeMonth(monthEntries), [monthEntries]);
  const streak = useMemo(() => weeklyStreak(entries), [entries]);
  const visible = day ? monthEntries.filter((e) => e.dayKey === day) : monthEntries;

  const goTo = useCallback((delta) => {
    setMonth((m) => shiftMonth(m, delta));
    setDay(null);
    setExpandedId(null);
  }, []);
  const goPrev = useCallback(() => goTo(-1), [goTo]);
  const goNext = useCallback(() => goTo(1), [goTo]);
  const toggle = useCallback((id) => setExpandedId((cur) => (cur === id ? null : id)), []);
  const selectDay = useCallback((key) => {
    setDay(key);
    setExpandedId(null);
  }, []);

  if (entries.length === 0) return <EmptyHistory onStart={onStart} />;

  const rawDayLabel = day
    ? visible[0]?.date.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' }) || ''
    : '';
  const dayLabel = rawDayLabel.charAt(0).toUpperCase() + rawDayLabel.slice(1);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <LuHistory className="w-4 h-4 text-lime-400" />
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300">Historial</h2>
        <span className="ml-auto text-xs text-zinc-500 font-mono">{entries.length} sesiones en total</span>
      </div>

      <MonthCalendar
        monthKey={month}
        sessionsByDay={sessionsByDay}
        summary={summary}
        streak={streak}
        selectedDay={day}
        todayKey={todayKey}
        canGoPrev={month > oldestMonth}
        canGoNext={month < newestMonth}
        onPrev={goPrev}
        onNext={goNext}
        onSelectDay={selectDay}
      />

      <section aria-label={`Sesiones de ${monthLabel(month)}`} className="space-y-2">
        <div className="flex items-center justify-between gap-2 px-1">
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            {day ? dayLabel : `Sesiones de ${monthLabel(month).toLowerCase()}`}
          </p>
          {day && (
            <button
              type="button"
              onClick={() => selectDay(null)}
              className="text-xs font-bold text-lime-400 hover:text-lime-300 flex items-center gap-1"
            >
              <LuX className="w-3.5 h-3.5" /> Ver todo el mes
            </button>
          )}
        </div>

        {visible.length === 0 ? (
          <div className="text-center py-10 bg-zinc-900/40 border border-dashed border-white/10 rounded-2xl">
            <p className="text-sm text-zinc-300 font-semibold">Sin entrenamientos en {monthLabel(month).toLowerCase()}</p>
            <p className="text-xs text-zinc-500 mt-1">Usa las flechas del calendario para ver otros meses.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {visible.map(({ log, date }) => (
              <SessionRow key={log._id} log={log} date={date} expanded={expandedId === log._id} onToggle={toggle} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default memo(WorkoutHistory);
