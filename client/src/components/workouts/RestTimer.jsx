import { useEffect, useState } from 'react';
import { LuSkipForward } from 'react-icons/lu';
import { fmtTime } from './workoutUtils';
import { announceRestDone } from './restAlert';

function secondsUntil(endsAt) {
  return Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
}

const RING_R = 15;
const RING_C = 2 * Math.PI * RING_R;
const FINAL_SECONDS = 5;
const ADJUST_STEP = 15; // seconds added/removed by the −/+ buttons

/*
 * Compact rest countdown that lives inside the sticky session bar: a progress
 * ring, the time left and two small actions. It owns the per-second tick, so
 * only this pill re-renders while resting.
 *
 * Its thin progress line is absolutely positioned against the nearest
 * positioned ancestor (the session bar), along that bar's bottom edge.
 *
 * rest: { type: 'set' | 'exercise', endsAt: ms timestamp, total: seconds }
 */
export default function RestTimer({ rest, onAddTime, onSkip, onDone }) {
  const [, setTick] = useState(0);
  const remaining = secondsUntil(rest.endsAt);

  useEffect(() => {
    const id = setInterval(() => {
      if (secondsUntil(rest.endsAt) === 0) {
        clearInterval(id);
        announceRestDone(rest.type);
        onDone(rest.type);
      } else {
        setTick((t) => t + 1);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [rest.endsAt, rest.type, onDone]);

  const progress = rest.total > 0 ? Math.min(1, (rest.total - remaining) / rest.total) : 0;
  const ending = remaining <= FINAL_SECONDS;
  const tone = ending
    ? { text: 'text-amber-300', stroke: 'stroke-amber-400', bar: 'bg-amber-400', ring: 'border-amber-400/40 bg-amber-400/10' }
    : rest.type === 'exercise'
      ? { text: 'text-cyan-300', stroke: 'stroke-cyan-400', bar: 'bg-cyan-400', ring: 'border-cyan-400/30 bg-cyan-400/10' }
      : { text: 'text-lime-300', stroke: 'stroke-lime-400', bar: 'bg-lime-400', ring: 'border-lime-400/30 bg-lime-400/10' };
  const label = rest.type === 'exercise' ? 'Cambio de ejercicio' : 'Descanso';

  return (
    <>
      <div
        className={`flex items-center gap-2 pl-1 pr-1.5 py-1 rounded-full border ${tone.ring} animate-fadeIn`}
        role="timer"
        aria-live="off"
        aria-label={`${label}: ${remaining} segundos restantes`}
      >
        <svg viewBox="0 0 36 36" className="w-8 h-8 -rotate-90 shrink-0" aria-hidden="true">
          <circle cx="18" cy="18" r={RING_R} fill="none" strokeWidth="3" className="stroke-white/10" />
          <circle
            cx="18" cy="18" r={RING_R} fill="none" strokeWidth="3" strokeLinecap="round"
            className={`${tone.stroke} transition-[stroke-dashoffset] duration-1000 ease-linear`}
            strokeDasharray={RING_C}
            strokeDashoffset={RING_C * (1 - progress)}
          />
        </svg>

        <div className="leading-none">
          <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">{label}</p>
          <p className={`text-lg font-mono font-black tabular-nums ${tone.text} ${ending ? 'animate-pulse' : ''}`}>
            {fmtTime(remaining)}
          </p>
        </div>

        {/* Adjust the running rest: −15 s / +15 s */}
        <div className="ml-1 flex items-center rounded-full bg-white/5 overflow-hidden" role="group" aria-label="Ajustar descanso">
          <button
            type="button"
            onClick={() => onAddTime(-ADJUST_STEP)}
            className="h-8 min-w-9 px-2 hover:bg-white/10 text-xs font-black text-zinc-200 transition active:scale-95"
            title={`Quitar ${ADJUST_STEP} segundos`}
            aria-label={`Quitar ${ADJUST_STEP} segundos`}
          >
            −{ADJUST_STEP}
          </button>
          <span className="w-px h-4 bg-white/10" aria-hidden="true" />
          <button
            type="button"
            onClick={() => onAddTime(ADJUST_STEP)}
            className="h-8 min-w-9 px-2 hover:bg-white/10 text-xs font-black text-zinc-200 transition active:scale-95"
            title={`Añadir ${ADJUST_STEP} segundos`}
            aria-label={`Añadir ${ADJUST_STEP} segundos`}
          >
            +{ADJUST_STEP}
          </button>
        </div>
        <button
          type="button"
          onClick={onSkip}
          className="h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition active:scale-95"
          title="Saltar descanso"
          aria-label="Saltar descanso"
        >
          <LuSkipForward className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Progress line along the bottom edge of the session bar */}
      <span className="absolute left-0 bottom-0 h-[3px] w-full bg-white/5 pointer-events-none" aria-hidden="true">
        <span
          className={`block h-full ${tone.bar} transition-[width] duration-1000 ease-linear`}
          style={{ width: `${progress * 100}%` }}
        />
      </span>
    </>
  );
}
