import { useEffect, useMemo, useState } from 'react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';
import { LuTrophy, LuChevronDown, LuInfo, LuRotateCcw, LuDumbbell } from 'react-icons/lu';
import api from '../../api/axios';

const TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
const MUSCLE = {
  chest: 'Pecho', back: 'Espalda', shoulders: 'Hombros', biceps: 'Bíceps', triceps: 'Tríceps', legs: 'Piernas',
  glutes: 'Glúteos', abs: 'Abdomen', calves: 'Gemelos', forearms: 'Antebrazos', full_body: 'Cuerpo completo', cardio: 'Cardio',
};
export const STATUS = {
  improving: { label: 'Mejorando', icon: '📈', cls: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/25' },
  stalled: { label: 'Estancado', icon: '➖', cls: 'text-amber-200 bg-amber-400/10 border-amber-400/25' },
  declining: { label: 'Bajando', icon: '📉', cls: 'text-rose-300 bg-rose-500/10 border-rose-500/25' },
  new: { label: 'Nuevo', icon: '🆕', cls: 'text-sky-300 bg-sky-500/10 border-sky-500/25' },
  paused: { label: 'Pausado', icon: '⏸', cls: 'text-zinc-400 bg-zinc-800 border-white/10' },
};
const FILTERS = ['improving', 'stalled', 'declining', 'new', 'paused'];
const FILTER_LABEL = { improving: 'Mejorando', stalled: 'Estancados', declining: 'Bajando', new: 'Nuevos', paused: 'Pausados' };
const SHOW = 8;

const num = (v) => Number(v).toLocaleString('es-CO', { maximumFractionDigits: 1 });
const fmtDay = (ymd) => new Date(`${ymd}T00:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
const setText = (x) => (x.weight > 0 ? `${num(x.weight)} kg × ${x.reps}` : `${x.reps} reps`);
const valueText = (e, v) => (e.metric === 'reps' ? `${v} reps` : `${num(v)} kg`);

function Sparkline({ points, color }) {
  if (points.length < 2) return <div className="w-20 h-8" aria-hidden="true" />;
  return (
    <div className="w-20 h-8 shrink-0" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points}>
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function DetailChart({ exercise }) {
  const data = exercise.points.map((p) => ({ ...p, label: fmtDay(p.day) }));
  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} minTickGap={16} />
          <YAxis tick={{ fontSize: 10, fill: '#71717a' }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
          <ReferenceLine y={exercise.best.value} stroke="#fbbf24" strokeDasharray="4 4" />
          <Tooltip
            contentStyle={{ backgroundColor: '#090a0f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
            labelStyle={{ color: '#fff', fontWeight: 'bold' }}
            formatter={(v, _n, item) => [`${valueText(exercise, v)} · ${setText(item.payload)}`, exercise.metric === 'reps' ? 'Repeticiones' : '1RM estimado']}
          />
          <Line type="monotone" dataKey="value" stroke="#a3e635" strokeWidth={2.5} dot={{ r: 3, fill: '#a3e635' }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function ExerciseRow({ exercise, open, onToggle }) {
  const st = STATUS[exercise.status];
  const color = exercise.status === 'improving' ? '#34d399' : exercise.status === 'declining' ? '#fb7185' : '#a1a1aa';
  const shown = exercise.current || exercise.best;
  return (
    <li className="rounded-2xl border border-white/5 bg-zinc-900/60 overflow-hidden">
      <button type="button" onClick={onToggle} aria-expanded={open} className="w-full text-left p-3 sm:p-4 flex items-center gap-3 hover:bg-white/[0.02]">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-bold text-sm text-white truncate max-w-full">{exercise.name}</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${st.cls}`}>{st.icon} {st.label}{exercise.changePct != null && exercise.status !== 'new' ? ` ${exercise.changePct > 0 ? '+' : ''}${exercise.changePct}%` : ''}</span>
          </div>
          <p className="text-xs text-zinc-400">
            {exercise.metric === 'reps' ? 'Máx.' : '1RM est.'} <span className="font-mono font-bold text-zinc-200">{valueText(exercise, shown.value)}</span>
            {exercise.metric !== 'reps' && <><span className="text-zinc-600"> · </span>{setText(shown)}</>}
            {exercise.metric === 'reps' && <span className="text-zinc-500"> en una serie</span>}
          </p>
          <p className="text-[11px] text-zinc-500">{MUSCLE[exercise.muscleGroup] || exercise.muscleGroup} · {exercise.sessions} {exercise.sessions === 1 ? 'sesión' : 'sesiones'} · última {fmtDay(exercise.lastDay)}</p>
        </div>
        <Sparkline points={exercise.points} color={color} />
        <LuChevronDown className={`w-4 h-4 text-zinc-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-3 sm:px-4 pb-4 space-y-2 border-t border-white/5 pt-3">
          <DetailChart exercise={exercise} />
          <p className="text-xs text-zinc-400 flex items-center gap-1.5">
            <LuTrophy className="w-3.5 h-3.5 text-amber-300" />
            Récord: <span className="font-bold text-zinc-200">{setText(exercise.best)}</span>
            {exercise.metric !== 'reps' && <> (1RM est. {num(exercise.best.value)} kg)</>} el {fmtDay(exercise.best.day)}
          </p>
        </div>
      )}
    </li>
  );
}

/*
 * "Progreso por ejercicio": is each exercise improving, stalled or going down
 * (last 12 weeks), plus the personal records of the selected period.
 */
export default function ExerciseProgress({ period, onLoaded }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState('all');
  const [openId, setOpenId] = useState(null);
  const [showAll, setShowAll] = useState(false);

  const load = () => {
    setError(false);
    api
      .get('/progress/exercises', { params: { tz: TIME_ZONE, period } })
      .then((r) => {
        setData(r.data);
        onLoaded?.(r.data);
      })
      .catch(() => setError(true));
  };
  useEffect(load, [period]); // eslint-disable-line react-hooks/exhaustive-deps

  const list = useMemo(() => (data ? data.exercises.filter((e) => filter === 'all' || e.status === filter) : []), [data, filter]);
  const visible = showAll ? list : list.slice(0, SHOW);

  return (
    <section className="space-y-3 animate-fadeInUp" aria-label="Progreso por ejercicio">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-extrabold text-base sm:text-lg text-white flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-lime-400/10 border border-lime-400/20 flex items-center justify-center text-lime-400">
              <LuDumbbell className="w-4 h-4" />
            </div>
            Progreso por ejercicio
          </h2>
          <p className="text-xs text-zinc-500 mt-1">Últimas 12 semanas · se compara tu mejor marca de las últimas 4 semanas con la anterior</p>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-white/10 bg-zinc-900/60 p-4 text-sm text-zinc-300 flex flex-wrap items-center gap-3">
          No se pudo cargar el progreso por ejercicio.
          <button type="button" onClick={load} className="inline-flex items-center gap-1.5 text-xs font-bold text-lime-300 hover:text-lime-200"><LuRotateCcw className="w-3.5 h-3.5" /> Reintentar</button>
        </div>
      )}

      {!data && !error && (
        <div className="space-y-2" aria-hidden="true">
          {[0, 1, 2].map((i) => <div key={i} className="h-[76px] rounded-2xl bg-zinc-900/60 border border-white/5 animate-pulse" />)}
        </div>
      )}

      {data && (
        <>
          {data.records.length > 0 && (
            <div className="rounded-2xl border border-amber-400/25 bg-amber-400/[0.05] p-3 sm:p-4 space-y-2">
              <p className="text-sm font-bold text-amber-200 flex items-center gap-2">
                <LuTrophy className="w-4 h-4" /> Récord personal en {data.records.length} {data.records.length === 1 ? 'ejercicio' : 'ejercicios'} en este periodo
              </p>
              <ul className="space-y-1">
                {data.records.slice(0, 5).map((r) => (
                  <li key={`${r.exerciseId}-${r.day}`} className="text-xs text-zinc-300 flex flex-wrap gap-x-1.5">
                    <span className="font-bold text-white">{r.name}</span>
                    <span>{setText(r)}{r.metric !== 'reps' ? ` (1RM est. ${num(r.value)} kg, antes ${num(r.previous)})` : ` (antes ${r.previous})`}</span>
                    <span className="text-zinc-500">· {fmtDay(r.day)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.exercises.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-zinc-900/40 p-6 text-center text-sm text-zinc-400">
              Aún no hay entrenamientos en las últimas 12 semanas. Cuando repitas un ejercicio en varias sesiones verás aquí si mejoras.
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5" role="group" aria-label="Filtrar por estado">
                {[['all', `Todos ${data.exercises.length}`], ...FILTERS.filter((f) => data.counts[f] > 0).map((f) => [f, `${STATUS[f].icon} ${FILTER_LABEL[f]} ${data.counts[f]}`])].map(([f, label]) => (
                  <button
                    key={f}
                    type="button"
                    aria-pressed={filter === f}
                    onClick={() => { setFilter(f); setShowAll(false); }}
                    className={`shrink-0 h-8 px-3 rounded-lg text-xs font-bold border transition ${filter === f ? 'bg-zinc-100 text-zinc-950 border-zinc-100' : 'bg-zinc-900 text-zinc-300 border-white/10 hover:text-white'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <ul className="space-y-2">
                {visible.map((e) => (
                  <ExerciseRow key={e.id} exercise={e} open={openId === e.id} onToggle={() => setOpenId(openId === e.id ? null : e.id)} />
                ))}
              </ul>
              {list.length > SHOW && (
                <button type="button" onClick={() => setShowAll((v) => !v)} className="w-full h-10 rounded-xl border border-white/10 text-xs font-bold text-zinc-300 hover:text-white">
                  {showAll ? 'Ver menos' : `Ver todos (${list.length})`}
                </button>
              )}
            </>
          )}

          <details className="text-xs text-zinc-500">
            <summary className="cursor-pointer inline-flex items-center gap-1 hover:text-zinc-300"><LuInfo className="w-3.5 h-3.5" /> ¿Cómo se calcula?</summary>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li><b>1RM estimado</b>: el peso que podrías levantar una vez, calculado con tu mejor serie de cada sesión (peso × (1 + reps / 30), fórmula de Epley). Permite comparar series con distinto peso y repeticiones.</li>
              <li><b>Mejorando</b>: tu mejor marca de las últimas 4 semanas supera en un 2 % o más a la de antes. <b>Bajando</b>: está un 5 % o más por debajo. <b>Estancado</b>: entre medias.</li>
              <li><b>Nuevo</b>: menos de 3 sesiones o nada antes de las últimas 4 semanas. <b>Pausado</b>: no lo haces desde hace más de 4 semanas.</li>
              <li><b>Récord personal</b>: una sesión que supera tu mejor marca de todo el historial. En ejercicios sin peso se usan las repeticiones.</li>
            </ul>
          </details>
        </>
      )}
    </section>
  );
}
