import { memo } from 'react';
import { LuChevronDown } from 'react-icons/lu';
import { FEELINGS } from './workoutUtils';
import { sessionTitle, totalSets, totalVolume, formatKg, formatMinutes } from './historyUtils';

const fmtWeight = (w) => (Number(w) || 0).toLocaleString('es');

/*
 * One session in the history: a compact row (date, title, key metrics,
 * feeling) that expands to show every exercise with its sets.
 */
function SessionRow({ log, date, expanded, onToggle }) {
  const feeling = FEELINGS.find((f) => f.v === log.feeling) || FEELINGS[1];
  const FeelingIcon = feeling.Icon;
  const exercises = log.exercises || [];
  const metrics = [
    log.durationMinutes > 0 && formatMinutes(log.durationMinutes),
    `${totalSets(log)} series`,
    totalVolume(log) > 0 && formatKg(totalVolume(log)),
  ].filter(Boolean);
  const detailId = `session-${log._id}`;

  return (
    <li className={`rounded-xl border transition-colors ${expanded ? 'bg-zinc-900 border-lime-400/30' : 'bg-zinc-900/60 border-white/5 hover:border-white/15'}`}>
      <button
        type="button"
        onClick={() => onToggle(log._id)}
        aria-expanded={expanded}
        aria-controls={detailId}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
      >
        <div className="w-11 shrink-0 text-center">
          <p className="text-lg font-black text-white font-mono leading-none">{date.getDate()}</p>
          <p className="text-[10px] font-bold uppercase text-zinc-400 mt-0.5">
            {date.toLocaleDateString('es', { weekday: 'short' }).replace('.', '')}
          </p>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{sessionTitle(log)}</p>
          <p className="text-xs text-zinc-400 font-mono truncate">{metrics.join(' · ')}</p>
        </div>
        <span className="shrink-0 flex items-center gap-1 text-xs text-zinc-300" title={feeling.l}>
          <FeelingIcon className="w-4 h-4 text-lime-400" aria-hidden="true" />
          <span className="hidden sm:inline">{feeling.l}</span>
        </span>
        <LuChevronDown className={`w-4 h-4 shrink-0 text-zinc-400 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {expanded && (
        <div id={detailId} className="px-3 pb-3 pt-1 space-y-3 border-t border-white/5 animate-fadeIn">
          <ul className="space-y-2 pt-2">
            {exercises.map((ex, i) => (
              <li key={i} className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                <span className="text-sm font-semibold text-zinc-100 sm:w-48 shrink-0 truncate">
                  {ex.exercise?.name || 'Ejercicio'}
                </span>
                <span className="flex flex-wrap gap-1.5">
                  {(ex.sets || []).map((s, si) => (
                    <span key={si} className="text-xs font-mono bg-zinc-800 border border-white/5 text-zinc-200 rounded-md px-2 py-0.5">
                      {fmtWeight(s.weight)} kg × {s.reps}
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
            <span>{date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</span>
            {log.caloriesBurned > 0 && <span>{log.caloriesBurned.toLocaleString('es')} kcal</span>}
            <span>Sensación: {feeling.l}</span>
          </div>
          {log.notes && !/^Rutina:/.test(log.notes) && (
            <p className="text-xs text-zinc-300 italic pl-3 border-l-2 border-lime-400/40">{log.notes}</p>
          )}
        </div>
      )}
    </li>
  );
}

export default memo(SessionRow);
