import { useEffect, useMemo, useRef, useState } from 'react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';
import { LuTrophy, LuInfo, LuRotateCcw, LuDumbbell, LuSearch, LuChevronDown, LuCheck } from 'react-icons/lu';
import api from '../../api/axios';
import { searchExercises } from '../routines/imageImport/exerciseSearch';

const TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
const MUSCLE = {
  chest: 'Pecho', back: 'Espalda', shoulders: 'Hombros', biceps: 'Bíceps', triceps: 'Tríceps', legs: 'Piernas',
  glutes: 'Glúteos', abs: 'Abdomen', calves: 'Gemelos', forearms: 'Antebrazos', full_body: 'Cuerpo completo', cardio: 'Cardio',
};
const STATUS = {
  improving: { label: 'Mejorando', icon: '📈', cls: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/25' },
  stalled: { label: 'Estancado', icon: '➖', cls: 'text-amber-200 bg-amber-400/10 border-amber-400/25' },
  declining: { label: 'Bajando', icon: '📉', cls: 'text-rose-300 bg-rose-500/10 border-rose-500/25' },
  new: { label: 'Sin datos para comparar', icon: '·', cls: 'text-zinc-400 bg-zinc-800 border-white/10' },
  paused: { label: 'Pausado', icon: '⏸', cls: 'text-zinc-400 bg-zinc-800 border-white/10' },
};

const num = (v) => Number(v).toLocaleString('es-CO', { maximumFractionDigits: 1 });
const fmtDay = (ymd) => new Date(`${ymd}T00:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
const setText = (x) => (x.weight > 0 ? `${num(x.weight)} kg × ${x.reps}` : `${x.reps} reps`);
const valueText = (e, v) => (e.metric === 'reps' ? `${v} reps` : `${num(v)} kg`);
const pct = (v) => `${v > 0 ? '+' : ''}${v}%`;

/* One status block of the summary: count + a few names (tap to see the chart). */
function StatusBlock({ status, items, onPick, max = 3 }) {
  const st = STATUS[status];
  const shown = items.slice(0, max);
  return (
    <div className={`rounded-xl border p-3 ${st.cls}`}>
      <p className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
        <span aria-hidden="true">{st.icon}</span> {st.label} <span className="font-mono">{items.length}</span>
      </p>
      {items.length === 0 ? (
        <p className="mt-1.5 text-xs text-zinc-500">Ninguno</p>
      ) : (
        <ul className="mt-1.5 space-y-1">
          {shown.map((e) => (
            <li key={e.id}>
              <button type="button" onClick={() => onPick(e.id)} className="w-full flex items-center justify-between gap-2 text-left text-xs text-zinc-200 hover:text-white">
                <span className="truncate">{e.name}</span>
                {e.changePct != null && <span className="shrink-0 font-mono font-bold">{pct(e.changePct)}</span>}
              </button>
            </li>
          ))}
          {items.length > max && <li className="text-[11px] text-zinc-500">y {items.length - max} más</li>}
        </ul>
      )}
    </div>
  );
}

/* Searchable selector of the exercise to look at (one at a time). */
function ExerciseSelect({ exercises, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const box = useRef(null);
  const results = useMemo(() => searchExercises(exercises, query, 50), [exercises, query]);
  const selected = exercises.find((e) => e.id === value);

  useEffect(() => {
    if (!open) return undefined;
    const close = (ev) => { if (!box.current?.contains(ev.target)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => { setQuery(''); setOpen((o) => !o); }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Elegir ejercicio"
        className="w-full h-11 bg-zinc-950 border border-white/10 rounded-xl pl-3 pr-9 text-left text-sm font-bold text-white truncate focus:border-lime-400/60 outline-none"
      >
        {selected ? selected.name : 'Elige un ejercicio'}
        <LuChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-40 left-0 right-0 mt-1 rounded-xl border border-white/15 bg-zinc-900 shadow-2xl shadow-black/60 overflow-hidden">
          <div className="relative border-b border-white/10">
            <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              autoFocus
              value={query}
              onChange={(ev) => setQuery(ev.target.value)}
              onKeyDown={(ev) => {
                if (ev.key === 'Escape') setOpen(false);
                if (ev.key === 'Enter' && results[0]) { onChange(results[0].id); setOpen(false); }
              }}
              placeholder="Buscar ejercicio…"
              aria-label="Buscar ejercicio"
              className="w-full h-10 bg-transparent pl-9 pr-3 text-sm text-white placeholder:text-zinc-500 outline-none"
            />
          </div>
          <ul role="listbox" className="max-h-[min(16rem,40vh)] overflow-y-auto py-1 text-sm">
            {results.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={e.id === value}
                  onClick={() => { onChange(e.id); setOpen(false); }}
                  className="w-full mx-0 px-3 py-2 text-left flex items-center gap-2 text-zinc-200 hover:bg-white/10"
                >
                  <span className="flex-1 min-w-0 truncate">{e.name}</span>
                  <span className="shrink-0 text-[11px] text-zinc-500">{e.sessions} {e.sessions === 1 ? 'día' : 'días'}</span>
                  {e.id === value && <LuCheck className="w-4 h-4 text-lime-400 shrink-0" />}
                </button>
              </li>
            ))}
            {results.length === 0 && <li className="px-3 py-3 text-xs text-zinc-400">No hay ejercicios con “{query}”.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

/* The chosen exercise: status, best mark, chart, record and last days. */
function ExerciseDetail({ exercise }) {
  const st = STATUS[exercise.status];
  const data = exercise.points.map((p) => ({ ...p, label: fmtDay(p.day) }));
  const last = exercise.points.slice(-3).reverse();
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`font-bold px-2 py-0.5 rounded-md border ${st.cls}`}>{st.icon} {st.label}{exercise.changePct != null ? ` ${pct(exercise.changePct)}` : ''}</span>
        <span className="text-zinc-400">{MUSCLE[exercise.muscleGroup] || exercise.muscleGroup} · {exercise.sessions} {exercise.sessions === 1 ? 'día entrenado' : 'días entrenados'} en 12 semanas</span>
      </div>

      {data.length >= 2 ? (
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} minTickGap={18} />
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
      ) : (
        <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-zinc-400">
          Solo hay un día registrado de este ejercicio. El gráfico aparece cuando lo hagas en otro día.
        </p>
      )}

      <div className="grid sm:grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-zinc-950 border border-white/5 p-3">
          <p className="text-zinc-500 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1"><LuTrophy className="w-3 h-3 text-amber-300" /> Récord</p>
          <p className="mt-1 text-zinc-200"><b className="text-white">{setText(exercise.best)}</b>{exercise.metric !== 'reps' && <> · 1RM est. {num(exercise.best.value)} kg</>} · {fmtDay(exercise.best.day)}</p>
        </div>
        <div className="rounded-xl bg-zinc-950 border border-white/5 p-3">
          <p className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">Últimos días</p>
          <ul className="mt-1 space-y-0.5 text-zinc-300">
            {last.map((p) => <li key={p.day}><span className="text-zinc-500">{fmtDay(p.day)}</span> · {setText(p)}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}

/*
 * "Progreso por ejercicio", fixed size whatever the history: a summary of
 * which exercises go up, stay or go down (only those with enough data), and
 * one exercise at a time, chosen with a searchable selector.
 */
export default function ExerciseProgress({ period, onLoaded }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const detailRef = useRef(null);

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

  const groups = useMemo(() => {
    const by = (s) => (data?.exercises || []).filter((e) => e.status === s);
    return {
      improving: by('improving').sort((a, b) => b.changePct - a.changePct),
      stalled: by('stalled'),
      declining: by('declining').sort((a, b) => a.changePct - b.changePct),
      waiting: by('new').length,
      paused: by('paused').length,
    };
  }, [data]);
  // Selector: most trained first.
  const options = useMemo(() => [...(data?.exercises || [])].sort((a, b) => b.sessions - a.sessions || a.name.localeCompare(b.name, 'es')), [data]);
  const selected = options.find((e) => e.id === selectedId) || options[0] || null;
  const comparable = groups.improving.length + groups.stalled.length + groups.declining.length;

  const pick = (id) => {
    setSelectedId(id);
    setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
  };

  return (
    <section className="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4 animate-fadeInUp" aria-label="Progreso por ejercicio">
      <div>
        <h2 className="font-extrabold text-base sm:text-lg text-white flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-lime-400/10 border border-lime-400/20 flex items-center justify-center text-lime-400">
            <LuDumbbell className="w-4 h-4" />
          </div>
          Progreso por ejercicio
        </h2>
        <p className="text-xs text-zinc-500 mt-1">¿En qué ejercicios subes tu marca? Últimas 12 semanas.</p>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-white/10 bg-zinc-950 p-4 text-sm text-zinc-300 flex flex-wrap items-center gap-3">
          No se pudo cargar el progreso por ejercicio.
          <button type="button" onClick={load} className="inline-flex items-center gap-1.5 text-xs font-bold text-lime-300 hover:text-lime-200"><LuRotateCcw className="w-3.5 h-3.5" /> Reintentar</button>
        </div>
      )}

      {!data && !error && <div className="h-40 rounded-xl bg-zinc-950/60 animate-pulse" aria-hidden="true" />}

      {data && data.exercises.length === 0 && (
        <p className="rounded-xl border border-dashed border-white/10 p-5 text-center text-sm text-zinc-400">
          Aún no hay entrenamientos en las últimas 12 semanas.
        </p>
      )}

      {data && data.exercises.length > 0 && (
        <>
          {/* 1. Summary */}
          {comparable > 0 ? (
            <div className="grid gap-2 sm:grid-cols-3">
              <StatusBlock status="improving" items={groups.improving} onPick={pick} />
              <StatusBlock status="stalled" items={groups.stalled} onPick={pick} />
              <StatusBlock status="declining" items={groups.declining} onPick={pick} />
            </div>
          ) : (
            <p className="rounded-xl border border-white/10 bg-zinc-950 p-4 text-sm text-zinc-300">
              Todavía no hay con qué comparar. Cuando repitas tus ejercicios en <b>semanas distintas</b> verás aquí en cuáles mejoras, en cuáles estás estancado y en cuáles bajas.
            </p>
          )}
          {comparable > 0 && (groups.waiting > 0 || groups.paused > 0) && (
            <p className="text-[11px] text-zinc-500">
              {groups.waiting > 0 && <>{groups.waiting} {groups.waiting === 1 ? 'ejercicio aún sin datos suficientes' : 'ejercicios aún sin datos suficientes'} para comparar</>}
              {groups.waiting > 0 && groups.paused > 0 && ' · '}
              {groups.paused > 0 && <>{groups.paused} sin hacer en las últimas 4 semanas</>}
            </p>
          )}

          {/* 2. Records of the period (compact) */}
          {data.records.length > 0 && (
            <p className="text-xs text-amber-200 flex items-start gap-2">
              <LuTrophy className="w-4 h-4 shrink-0" />
              <span>
                Récord en este periodo:{' '}
                {data.records.slice(0, 3).map((r, i) => (
                  <span key={r.exerciseId}>
                    {i > 0 && ', '}
                    <button type="button" onClick={() => pick(r.exerciseId)} className="font-bold underline-offset-2 hover:underline">{r.name}</button> ({setText(r)})
                  </span>
                ))}
                {data.records.length > 3 && ` y ${data.records.length - 3} más`}
              </span>
            </p>
          )}

          {/* 3. One exercise at a time */}
          {selected && (
            <div ref={detailRef} className="rounded-xl border border-white/10 bg-zinc-950/50 p-3 sm:p-4 space-y-3">
              <ExerciseSelect exercises={options} value={selected.id} onChange={setSelectedId} />
              <ExerciseDetail exercise={selected} />
            </div>
          )}

          <details className="text-xs text-zinc-500">
            <summary className="cursor-pointer inline-flex items-center gap-1 hover:text-zinc-300"><LuInfo className="w-3.5 h-3.5" /> ¿Cómo se calcula?</summary>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>De cada día que entrenas un ejercicio se toma tu <b>mejor serie</b> y se calcula el <b>1RM estimado</b> (el peso que podrías levantar una vez: peso × (1 + reps / 30)). Así se comparan series con distinto peso y repeticiones. En ejercicios sin peso se usan las repeticiones.</li>
              <li><b>Mejorando</b>: tu mejor marca de las últimas 4 semanas supera en un 2 % o más a la de antes. <b>Bajando</b>: un 5 % o más por debajo. <b>Estancado</b>: entre medias.</li>
              <li>Hace falta haberlo hecho en al menos 3 días, alguno de ellos antes de las últimas 4 semanas, para poder comparar.</li>
            </ul>
          </details>
        </>
      )}
    </section>
  );
}
