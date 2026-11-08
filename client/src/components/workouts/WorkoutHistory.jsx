import { memo } from 'react';
import {
  LuActivity, LuPlus, LuHistory, LuClock, LuDumbbell, LuTarget, LuTrendingUp,
} from 'react-icons/lu';
import { FEELINGS } from './workoutUtils';

/* Per-session metrics shown on a history card. */
function summarize(log) {
  const exercises = log.exercises || [];
  return {
    exerciseNames: exercises.map((e) => e.exercise?.name || 'Ejercicio'),
    totalSets: exercises.reduce((sum, e) => sum + (e.sets?.length || 0), 0),
    maxWeight: exercises.reduce(
      (max, e) => Math.max(max, ...(e.sets || []).map((s) => s.weight || 0)),
      0
    ),
  };
}

function StatTile({ Icon, iconClass, value, label }) {
  return (
    <div className="bg-zinc-950 border border-white/5 rounded-xl px-3 py-2 flex items-center gap-2">
      <Icon className={`w-4 h-4 shrink-0 ${iconClass}`} />
      <div>
        <p className="text-xs font-bold text-white font-mono">{value}</p>
        <p className="text-[10px] text-zinc-500">{label}</p>
      </div>
    </div>
  );
}

const WorkoutCard = memo(function WorkoutCard({ log }) {
  const feeling = FEELINGS.find((f) => f.v === log.feeling) || FEELINGS[1];
  const FeelingIcon = feeling.Icon;
  const { exerciseNames, totalSets, maxWeight } = summarize(log);
  const date = new Date(log.date);

  return (
    <div className="group bg-zinc-900 border border-white/10 hover:border-lime-400/40 rounded-2xl p-5 transition-all duration-200 shadow-md space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-white/10 flex flex-col items-center justify-center shrink-0">
            <span className="text-base font-black text-white leading-none font-mono">
              {date.getDate()}
            </span>
            <span className="text-[10px] text-zinc-400 font-bold uppercase mt-0.5">
              {date.toLocaleDateString('es', { month: 'short' })}
            </span>
          </div>

          <div>
            <p className="text-xs text-zinc-400 capitalize">
              {date.toLocaleDateString('es', { weekday: 'long' })}
            </p>
            <h3 className="font-bold text-white text-base leading-tight mt-0.5">
              {exerciseNames.length <= 3
                ? exerciseNames.join(', ')
                : `${exerciseNames.slice(0, 3).join(', ')} +${exerciseNames.length - 3} más`}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800 border border-white/10 text-xs font-semibold text-zinc-200">
          <FeelingIcon className="w-3.5 h-3.5 text-lime-400" />
          <span>{feeling.l}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {log.durationMinutes > 0 && (
          <StatTile Icon={LuClock} iconClass="text-cyan-400" value={`${log.durationMinutes} min`} label="Duración" />
        )}
        <StatTile Icon={LuDumbbell} iconClass="text-lime-400" value={log.exercises?.length || 0} label="Ejercicios" />
        {totalSets > 0 && (
          <StatTile Icon={LuTarget} iconClass="text-emerald-400" value={totalSets} label="Series" />
        )}
        {maxWeight > 0 && (
          <StatTile Icon={LuTrendingUp} iconClass="text-amber-400" value={`${maxWeight} kg`} label="Peso máx." />
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {exerciseNames.map((name, i) => (
          <span
            key={i}
            className="bg-zinc-800 text-zinc-300 text-[11px] px-2.5 py-1 rounded-lg font-medium border border-white/5"
          >
            {name}
          </span>
        ))}
      </div>

      {log.notes && (
        <p className="text-xs text-zinc-400 italic pl-3 border-l-2 border-lime-400/40">
          {log.notes}
        </p>
      )}
    </div>
  );
});

/* List of past sessions, or an empty state that invites starting the first one. */
function WorkoutHistory({ logs, onStart }) {
  if (logs.length === 0) {
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <LuHistory className="w-4 h-4 text-lime-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
            Historial de Sesiones
          </h2>
        </div>
        <span className="text-xs text-zinc-500 font-mono">{logs.length} registradas</span>
      </div>

      {logs.map((log) => (
        <WorkoutCard key={log._id} log={log} />
      ))}
    </div>
  );
}

export default memo(WorkoutHistory);
