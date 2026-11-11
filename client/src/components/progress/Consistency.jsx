import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LuCalendarCheck, LuFlame, LuTrophy, LuRotateCcw } from 'react-icons/lu';
import api from '../../api/axios';

const TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
const fmtDay = (ymd) => new Date(`${ymd}T00:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
const dec = (v) => Number(v).toLocaleString('es-CO', { maximumFractionDigits: 1 });
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/*
 * "Constancia": training days per week over the last 12 weeks against the
 * weekly goal of the profile, and the streak. Always the same size.
 */
export default function Consistency() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  const load = () => {
    setError(false);
    api.get('/progress/consistency', { params: { tz: TIME_ZONE } }).then((r) => setData(r.data)).catch(() => setError(true));
  };
  useEffect(load, []);

  const max = data ? Math.max(data.goal, ...data.weeks.map((w) => w.days), 1) : 1;

  return (
    <section className="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4 animate-fadeInUp" aria-label="Constancia">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-extrabold text-base sm:text-lg text-white flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-400/10 border border-orange-400/20 flex items-center justify-center text-orange-300">
              <LuCalendarCheck className="w-4 h-4" />
            </div>
            Constancia
          </h2>
          {data && (
            <p className="text-xs text-zinc-500 mt-1">
              Tu meta: {plural(data.goal, 'día', 'días')} por semana ·{' '}
              <Link to="/profile" className="text-lime-300/90 hover:text-lime-200 underline-offset-2 hover:underline">cambiar</Link>
            </p>
          )}
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-white/10 bg-zinc-950 p-4 text-sm text-zinc-300 flex flex-wrap items-center gap-3">
          No se pudo cargar tu constancia.
          <button type="button" onClick={load} className="inline-flex items-center gap-1.5 text-xs font-bold text-lime-300 hover:text-lime-200"><LuRotateCcw className="w-3.5 h-3.5" /> Reintentar</button>
        </div>
      )}
      {!data && !error && <div className="h-40 rounded-xl bg-zinc-950/60 animate-pulse" aria-hidden="true" />}

      {data && (
        <>
          <p className="text-sm text-zinc-200 font-semibold">
            {data.totalDays === 0
              ? 'Aún no hay entrenamientos en las últimas 12 semanas.'
              : <>Entrenaste {data.weeksTrained} de las últimas 12 semanas · {dec(data.perWeek)} días por semana de media.</>}
          </p>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-zinc-950 border border-white/5 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Esta semana</p>
              <p className="mt-1 text-lg font-black text-white font-mono">{data.thisWeek.days}<span className="text-xs text-zinc-500 font-sans font-semibold"> / {data.goal}</span></p>
              <p className="text-[11px] text-zinc-400">{data.thisWeek.remaining === 0 ? '¡Meta cumplida!' : `Te ${data.thisWeek.remaining === 1 ? 'falta 1 día' : `faltan ${data.thisWeek.remaining} días`}`}</p>
            </div>
            <div className="rounded-xl bg-zinc-950 border border-white/5 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1"><LuFlame className="w-3 h-3 text-orange-400" /> Racha</p>
              <p className="mt-1 text-lg font-black text-white font-mono">{data.streak}</p>
              <p className="text-[11px] text-zinc-400">{data.streak === 1 ? 'semana' : 'semanas'} cumpliendo tu meta</p>
            </div>
            <div className="rounded-xl bg-zinc-950 border border-white/5 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1"><LuTrophy className="w-3 h-3 text-amber-300" /> Mejor racha</p>
              <p className="mt-1 text-lg font-black text-white font-mono">{data.bestStreak}</p>
              <p className="text-[11px] text-zinc-400">{data.bestStreak === 1 ? 'semana' : 'semanas'}</p>
            </div>
          </div>

          {/* 12 weeks, oldest → this week */}
          <div>
            <div className="relative h-24 flex items-end gap-1 sm:gap-1.5" role="img" aria-label={`Días entrenados por semana en las últimas 12 semanas; meta ${data.goal} por semana`}>
              <div className="absolute inset-x-0 border-t border-dashed border-lime-400/40 pointer-events-none" style={{ bottom: `${(data.goal / max) * 100}%` }} aria-hidden="true" />
              {data.weeks.map((w) => (
                <div key={w.from} className="flex-1 h-full flex flex-col justify-end items-center" title={`${fmtDay(w.from)} – ${fmtDay(w.to)}: ${plural(w.days, 'día', 'días')}`}>
                  {w.days > 0 && <span className="text-[10px] font-mono text-zinc-400 mb-0.5">{w.days}</span>}
                  <div
                    className={`w-full rounded-t-md ${w.met ? 'bg-lime-400' : w.days > 0 ? 'bg-zinc-500' : 'bg-zinc-800'} ${w.current ? 'ring-1 ring-white/50' : ''}`}
                    style={{ height: w.days > 0 ? `${(w.days / max) * 100}%` : '3px', opacity: w.current && !w.met ? 0.7 : 1 }}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-1 sm:gap-1.5 mt-1 text-[10px] text-zinc-500">
              {data.weeks.map((w, i) => (
                <span key={w.from} className={`flex-1 min-w-0 whitespace-nowrap overflow-visible ${w.current ? 'text-right' : 'text-left'}`}>{w.current ? 'Hoy' : i % 4 === 0 ? fmtDay(w.from) : ''}</span>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-zinc-500 flex flex-wrap gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-lime-400" /> Meta cumplida</span>
              <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-zinc-500" /> Por debajo de la meta</span>
              <span className="inline-flex items-center gap-1"><span className="w-3 border-t border-dashed border-lime-400/60" /> Tu meta</span>
            </p>
          </div>
        </>
      )}
    </section>
  );
}
