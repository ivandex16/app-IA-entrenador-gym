import { memo } from 'react';
import { LuHourglass, LuRefreshCw } from 'react-icons/lu';
import { fmtPreset } from './workoutUtils';

const ROWS = [
  {
    key: 'betweenSets',
    label: 'Entre series',
    Icon: LuHourglass,
    presets: [45, 60, 90, 120, 180],
    step: 15, min: 15, max: 600,
    accent: { text: 'text-lime-400', active: 'bg-lime-400 text-zinc-950' },
  },
  {
    key: 'betweenExercises',
    label: 'Entre ejercicios',
    Icon: LuRefreshCw,
    presets: [60, 120, 180, 240, 300],
    step: 30, min: 30, max: 900,
    accent: { text: 'text-cyan-400', active: 'bg-cyan-400 text-zinc-950' },
  },
];

const stepBtn = 'px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold disabled:opacity-40';

/*
 * Rest duration editor (between sets / between exercises). Purely controlled:
 * it shows `value` and reports a whole new value through `onChange`, so the
 * caller decides whether it edits the saved defaults or just this session.
 */
function RestConfigPanel({ value, onChange }) {
  const set = (key, seconds) => onChange({ ...value, [key]: seconds });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {ROWS.map(({ key, label, Icon, presets, step, min, max, accent }) => {
        const current = value[key];
        return (
          <div key={key} className="bg-zinc-950 border border-white/10 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <Icon className={`w-3.5 h-3.5 ${accent.text}`} /> {label}:
              </span>
              <span className={`text-xs font-mono font-bold ${accent.text}`}>{fmtPreset(current)}</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => set(key, Math.max(min, current - step))}
                disabled={current <= min}
                className={stepBtn}
                aria-label={`${label}: quitar ${step} segundos`}
              >
                -{step}s
              </button>
              {presets.map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => set(key, sec)}
                  aria-pressed={current === sec}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    current === sec ? accent.active : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  {fmtPreset(sec)}
                </button>
              ))}
              <button
                type="button"
                onClick={() => set(key, Math.min(max, current + step))}
                disabled={current >= max}
                className={stepBtn}
                aria-label={`${label}: añadir ${step} segundos`}
              >
                +{step}s
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default memo(RestConfigPanel);
