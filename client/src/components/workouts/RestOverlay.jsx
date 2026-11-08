import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { LuRefreshCw, LuHourglass, LuSkipForward } from 'react-icons/lu';
import { fmtTime } from './workoutUtils';

/* Three short beeps to signal the end of a rest period. */
function playRestAlert() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const playBeep = (freq, delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.value = 0.3;
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.15);
    };
    playBeep(880, 0);
    playBeep(880, 0.2);
    playBeep(1320, 0.4);
  } catch {
    // Fallback: no sound
  }
}

function secondsUntil(endsAt) {
  return Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
}

/*
 * Floating rest countdown. The parent only stores when the rest ends
 * (`rest.endsAt`); this component owns the per-second tick, so the countdown
 * re-renders just this overlay instead of the whole workout page.
 *
 * rest: { type: 'set' | 'exercise', endsAt: ms timestamp, total: seconds }
 */
export default function RestOverlay({ rest, onAddTime, onSkip, onDone }) {
  const [, setTick] = useState(0);
  const remaining = secondsUntil(rest.endsAt);

  useEffect(() => {
    const id = setInterval(() => {
      if (secondsUntil(rest.endsAt) === 0) {
        clearInterval(id);
        playRestAlert();
        toast('¡Descanso terminado! A trabajar', { icon: '⚡', duration: 4000 });
        onDone();
      } else {
        setTick((t) => t + 1);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [rest.endsAt, onDone]);

  const progress = rest.total > 0 ? (rest.total - remaining) / rest.total : 0;

  return (
    <div className="sticky top-4 z-40 bg-zinc-900 border border-lime-400/50 rounded-2xl p-4 shadow-2xl backdrop-blur-md animate-fadeIn">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-lime-400 flex items-center gap-1.5">
          {rest.type === 'exercise' ? (
            <><LuRefreshCw className="w-4 h-4 animate-spin text-cyan-400" /> Descanso entre ejercicios</>
          ) : (
            <><LuHourglass className="w-4 h-4 text-lime-400" /> Descanso entre series</>
          )}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onAddTime(15)}
            className="text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded-lg border border-white/10 active:scale-95 transition"
          >
            +15s
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-1 active:scale-95 transition"
          >
            Saltar <LuSkipForward className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="text-center my-1">
        <span className="text-4xl sm:text-5xl font-mono font-black text-white tabular-nums tracking-tight">
          {fmtTime(remaining)}
        </span>
      </div>
      <div className="w-full bg-zinc-800 rounded-full h-2 mt-3 overflow-hidden border border-white/5">
        <div
          className="h-full bg-lime-400 rounded-full transition-all duration-1000 shadow-[0_0_12px_rgba(163,230,53,0.5)]"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}
