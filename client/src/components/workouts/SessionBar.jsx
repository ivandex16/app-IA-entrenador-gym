import { memo } from 'react';
import { LuClock, LuTarget, LuDumbbell, LuPlay, LuSquare, LuHourglass, LuRefreshCw } from 'react-icons/lu';
import ElapsedTime from './ElapsedTime';
import RestTimer from './RestTimer';

/*
 * Sticky session bar: session clock (hh:mm:ss), progress, rest countdown (or
 * manual rest buttons) and start / finish. It stays visible below the navbar
 * while the user scrolls through the exercises, at a single compact height.
 * Only <ElapsedTime> and <RestTimer> inside it tick every second.
 */
function SessionBar({
  isActive, startTime, completedSets, totalSets, volumeKg, canStart, rest, saving = false,
  onStart, onFinish, onStartRest, onAddRestTime, onSkipRest, onRestDone,
}) {
  return (
    <div className="relative overflow-hidden bg-zinc-900/90 backdrop-blur-md border border-white/10 rounded-2xl px-3 py-2 sm:px-4 shadow-xl shadow-black/40 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        <span
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-base sm:text-lg font-mono font-black tabular-nums ${
            isActive ? 'bg-red-500/10 border-red-500/30 text-white' : 'bg-zinc-800 border-white/10 text-zinc-400'
          }`}
          title="Tiempo total de la sesión"
        >
          {isActive ? (
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          ) : (
            <LuClock className="w-4 h-4" />
          )}
          <ElapsedTime startTime={startTime} isActive={isActive} withHours />
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-400">
          <LuTarget className="w-3.5 h-3.5" />
          {completedSets}/{totalSets}
          <span className="hidden sm:inline">series</span>
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400">
          <LuDumbbell className="w-3.5 h-3.5" />
          {volumeKg.toLocaleString()} kg
        </span>
      </div>

      <div className="flex items-center gap-2">
        {isActive ? (
          <>
            {rest ? (
              <RestTimer rest={rest} onAddTime={onAddRestTime} onSkip={onSkipRest} onDone={onRestDone} />
            ) : (
              <div className="flex items-center gap-1" role="group" aria-label="Iniciar descanso">
                <button
                  type="button"
                  onClick={() => onStartRest('set')}
                  className="px-2.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-xs font-bold text-zinc-200 flex items-center gap-1 active:scale-95 transition"
                  title="Iniciar descanso entre series"
                >
                  <LuHourglass className="w-3.5 h-3.5 text-lime-400" /> Serie
                </button>
                <button
                  type="button"
                  onClick={() => onStartRest('exercise')}
                  className="px-2.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-xs font-bold text-zinc-200 flex items-center gap-1 active:scale-95 transition"
                  title="Iniciar descanso entre ejercicios"
                >
                  <LuRefreshCw className="w-3.5 h-3.5 text-cyan-400" /> Ejercicio
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={onFinish}
              disabled={saving}
              aria-label="Finalizar entrenamiento"
              title={saving ? 'Guardando…' : 'Finalizar entrenamiento'}
              className="h-9 px-3 sm:px-4 rounded-xl bg-lime-400 hover:bg-lime-300 disabled:opacity-60 disabled:cursor-wait text-zinc-950 font-black text-xs tracking-wide shadow-lg shadow-lime-400/25 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <LuSquare className="w-3.5 h-3.5 fill-zinc-950" />
              <span className="hidden sm:inline">FINALIZAR</span>
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onStart}
            disabled={!canStart}
            title={canStart ? 'Iniciar el cronómetro de la sesión' : 'Añade al menos un ejercicio para empezar'}
            className="px-4 py-2 rounded-xl bg-lime-400 hover:bg-lime-300 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:shadow-none text-zinc-950 font-black text-xs tracking-wide shadow-lg shadow-lime-400/25 active:scale-95 transition-all flex items-center gap-1.5"
          >
            <LuPlay className="w-3.5 h-3.5 fill-current" /> INICIAR
          </button>
        )}
      </div>
    </div>
  );
}

export default memo(SessionBar);
