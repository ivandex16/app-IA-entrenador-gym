import { memo } from 'react';
import { LuChevronLeft, LuChevronRight, LuFlame, LuClock, LuDumbbell, LuCalendarCheck } from 'react-icons/lu';
import { monthGrid, monthLabel, dayKeyOf, formatKg, formatMinutes } from './historyUtils';

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function Stat({ Icon, value, label, accent }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <Icon className={`w-4 h-4 shrink-0 ${accent}`} aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-sm font-black text-white font-mono leading-tight truncate">{value}</p>
        <p className="text-[11px] text-zinc-400 leading-tight">{label}</p>
      </div>
    </div>
  );
}

/*
 * Month calendar: navigation between months, monthly summary, weekly streak
 * and a grid where trained days are highlighted. Selecting a day filters the
 * list below to that day (select it again to clear).
 */
function MonthCalendar({
  monthKey, sessionsByDay, summary, streak, selectedDay, todayKey,
  canGoPrev, canGoNext, onPrev, onNext, onSelectDay,
}) {
  const cells = monthGrid(monthKey);

  return (
    <section className="bg-zinc-900 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4" aria-label="Calendario de entrenamientos">
      {/* Month navigation */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={!canGoPrev}
          className="w-9 h-9 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition disabled:opacity-30 disabled:pointer-events-none"
          aria-label="Mes anterior"
        >
          <LuChevronLeft className="w-4 h-4" />
        </button>
        <h2 className="text-base font-black text-white tracking-tight" aria-live="polite">{monthLabel(monthKey)}</h2>
        <button
          type="button"
          onClick={onNext}
          disabled={!canGoNext}
          className="w-9 h-9 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition disabled:opacity-30 disabled:pointer-events-none"
          aria-label="Mes siguiente"
        >
          <LuChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Month summary + streak */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-2 gap-3 bg-zinc-950/60 border border-white/5 rounded-xl p-3">
        <Stat Icon={LuCalendarCheck} accent="text-lime-400" value={summary.sessions} label={summary.sessions === 1 ? 'sesión' : 'sesiones'} />
        <Stat Icon={LuClock} accent="text-cyan-400" value={formatMinutes(summary.minutes)} label="entrenando" />
        <Stat Icon={LuDumbbell} accent="text-amber-400" value={formatKg(summary.volume)} label="volumen" />
        <Stat
          Icon={LuFlame}
          accent={streak > 0 ? 'text-orange-400' : 'text-zinc-500'}
          value={`${streak} ${streak === 1 ? 'semana' : 'semanas'}`}
          label="racha"
        />
      </div>

      {/* Calendar grid (Monday first) */}
      <div>
        <div className="grid grid-cols-7 gap-1 mb-1" aria-hidden="true">
          {WEEKDAYS.map((d) => (
            <span key={d} className="text-center text-[11px] font-bold text-zinc-500">{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((date, i) => {
            if (!date) return <span key={`b${i}`} />;
            const key = dayKeyOf(date);
            const count = sessionsByDay.get(key) || 0;
            const isSelected = selectedDay === key;
            const isToday = todayKey === key;
            const label = `${date.getDate()} de ${date.toLocaleDateString('es', { month: 'long' })}: ${
              count === 0 ? 'sin entrenamiento' : count === 1 ? '1 entrenamiento' : `${count} entrenamientos`
            }`;
            return (
              <button
                key={key}
                type="button"
                disabled={count === 0}
                onClick={() => onSelectDay(isSelected ? null : key)}
                aria-pressed={isSelected}
                aria-label={label}
                className={`relative h-10 sm:h-11 rounded-lg text-sm font-bold font-mono flex items-center justify-center transition
                  ${count > 0
                    ? isSelected
                      ? 'bg-lime-400 text-zinc-950 shadow-lg shadow-lime-400/25'
                      : 'bg-lime-400/15 text-lime-300 border border-lime-400/30 hover:bg-lime-400/25'
                    : 'text-zinc-500 cursor-default'}
                  ${isToday && !isSelected ? 'ring-1 ring-white/40' : ''}`}
              >
                {date.getDate()}
                {count > 1 && (
                  <span className={`absolute top-0.5 right-1 text-[9px] font-black ${isSelected ? 'text-zinc-900' : 'text-lime-400'}`}>
                    ×{count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default memo(MonthCalendar);
