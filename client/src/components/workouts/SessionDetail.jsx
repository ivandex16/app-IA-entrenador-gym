import { memo, useEffect, useRef, useState } from 'react';
import {
  LuArrowLeft, LuStar, LuPlay, LuEllipsisVertical, LuPencil, LuCopy, LuTrash2,
  LuClock, LuDumbbell, LuLayers, LuWeight, LuFlame, LuTrendingUp, LuTrendingDown, LuMinus, LuSparkles,
  LuHourglass, LuCircleDashed,
} from 'react-icons/lu';
import { FEELINGS } from './workoutUtils';
import {
  sessionTitle, sessionType, muscleGroupsOf, MUSCLE_LABELS, totalSets, totalVolume,
  formatKg, formatMinutes, exerciseKey, topSet, pendingExercises, restInfo, formatRest,
} from './historyUtils';
import { STATUS_META, statusOf, isOpen, WORKOUT_STATUS } from './workoutStatus';

const fmtClock = (d) => new Date(d).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });

/* Minutes trained: the saved duration, or the active time of an unfinished session. */
function durationOf(log) {
  if (log.durationMinutes > 0) return log.durationMinutes;
  if (log.activeSeconds > 0) return Math.max(1, Math.round(log.activeSeconds / 60));
  return 0;
}

/* "Descanso: 90 s" (planned) and, when recorded, what was actually rested after each set. */
function RestLine({ exercise }) {
  const { planned, actual } = restInfo(exercise);
  const taken = actual.map((sec, i) => (sec == null ? null : { set: i + 1, sec })).filter(Boolean);
  if (planned == null && taken.length === 0) return null;
  return (
    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-zinc-500">
      <LuHourglass className="w-3 h-3 text-lime-400/80" aria-hidden="true" />
      {planned != null && <span>Descanso: {formatRest(planned)}</span>}
      {taken.length > 0 && (
        <span title="Descanso real tras cada serie">
          real {taken.map((t) => `S${t.set} ${formatRest(t.sec)}`).join(' · ')}
        </span>
      )}
    </p>
  );
}

const fmtNum = (n) => (Number(n) || 0).toLocaleString('es', { maximumFractionDigits: 2 });

/* Small signal of progress vs the previous session with the same exercise. */
function ProgressBadge({ current, previous }) {
  if (!current) return null;
  if (!previous) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[11px] font-bold text-sky-300">
        <LuSparkles className="w-3 h-3" aria-hidden="true" /> Primera vez
      </span>
    );
  }
  const dw = current.weight - previous.weight;
  const dr = current.reps - previous.reps;
  if (dw === 0 && dr === 0) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[11px] font-bold text-zinc-400">
        <LuMinus className="w-3 h-3" aria-hidden="true" /> Igual
      </span>
    );
  }
  const up = dw > 0 || (dw === 0 && dr > 0);
  const Icon = up ? LuTrendingUp : LuTrendingDown;
  const text = dw !== 0 ? `${dw > 0 ? '+' : '−'}${fmtNum(Math.abs(dw))} kg` : `${dr > 0 ? '+' : '−'}${Math.abs(dr)} reps`;
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[11px] font-bold ${up ? 'text-lime-400' : 'text-rose-400'}`}>
      <Icon className="w-3 h-3" aria-hidden="true" /> {text}
      <span className="sr-only">respecto a la sesión anterior</span>
    </span>
  );
}

function Stat({ Icon, label, value, accent = 'text-lime-400' }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
        <Icon className={`w-3.5 h-3.5 ${accent}`} aria-hidden="true" /> {label}
      </p>
      <p className="mt-0.5 text-lg font-black text-white font-mono truncate">{value}</p>
    </div>
  );
}

/* "More" menu for secondary actions (edit, duplicate, delete). */
function ActionsMenu({ onEdit, onDuplicate, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (e.type === 'keydown' ? e.key === 'Escape' : !ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const item = 'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left rounded-lg hover:bg-white/5';
  const run = (fn) => () => { setOpen(false); fn(); };
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Más acciones"
        className="w-10 h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-zinc-300 hover:text-white flex items-center justify-center"
      >
        <LuEllipsisVertical className="w-4 h-4" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-11 z-30 w-48 p-1 rounded-xl bg-zinc-900 border border-white/10 shadow-2xl shadow-black/60 animate-fadeIn">
          <button role="menuitem" type="button" onClick={run(onEdit)} className={`${item} text-zinc-200`}>
            <LuPencil className="w-4 h-4 text-zinc-400" /> Editar
          </button>
          <button role="menuitem" type="button" onClick={run(onDuplicate)} className={`${item} text-zinc-200`}>
            <LuCopy className="w-4 h-4 text-zinc-400" /> Duplicar
          </button>
          <div className="my-1 h-px bg-white/5" />
          <button role="menuitem" type="button" onClick={run(onDelete)} className={`${item} text-rose-300 hover:bg-rose-500/10`}>
            <LuTrash2 className="w-4 h-4" /> Eliminar
          </button>
        </div>
      )}
    </div>
  );
}

/*
 * Full detail of one session: header with actions, summary metrics, exercises
 * (table on wide screens, stacked on mobile) with progress vs the previous
 * session, and notes. `previous` maps exerciseKey → top set of the last time.
 */
function SessionDetail({
  entry, previous, previousReady = true, onBack, onRepeat, onResume, resuming = false, onEdit, onDuplicate, onDelete, onToggleFavorite,
}) {
  const { log, date } = entry;
  const status = statusOf(log);
  const open = isOpen(log);
  const pending = status === WORKOUT_STATUS.COMPLETED ? [] : pendingExercises(log);
  const minutes = durationOf(log);
  const feeling = FEELINGS.find((f) => f.v === log.feeling) || FEELINGS[1];
  const FeelingIcon = feeling.Icon;
  const muscles = muscleGroupsOf(log);
  const exercises = log.exercises || [];
  const userNotes = (log.notes || '').replace(/^Rutina:.*$/m, '').trim();
  const dateLabel = date.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <article className="space-y-6" aria-label={`Detalle: ${sessionTitle(log)}`}>
      {/* Header */}
      <header className="space-y-3">
        {onBack && (
          <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-white xl:hidden">
            <LuArrowLeft className="w-4 h-4" /> Historial
          </button>
        )}
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-lime-400/10 text-lime-300 border border-lime-400/20">
                {sessionType(log) === 'routine' ? 'Rutina' : 'Entreno libre'}
              </span>
              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${STATUS_META[status].badge}`}>
                {STATUS_META[status].label}
              </span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight leading-tight">{sessionTitle(log)}</h2>
            <p className="mt-1 text-sm text-zinc-400 first-letter:uppercase">
              {dateLabel} · {date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
            </p>
            {(log.startedAt || log.endedAt) && (
              <p className="mt-0.5 text-xs text-zinc-500">
                {log.startedAt && <>Inicio {fmtClock(log.startedAt)}</>}
                {log.startedAt && log.endedAt && ' · '}
                {log.endedAt && <>Fin {fmtClock(log.endedAt)}</>}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onToggleFavorite(log)}
            aria-pressed={Boolean(log.favorite)}
            aria-label={log.favorite ? 'Quitar de favoritas' : 'Marcar como favorita'}
            title={log.favorite ? 'Quitar de favoritas' : 'Marcar como favorita'}
            className={`w-10 h-10 shrink-0 rounded-xl border flex items-center justify-center transition ${
              log.favorite ? 'bg-amber-400/15 border-amber-400/40 text-amber-300' : 'bg-zinc-800 border-white/10 text-zinc-400 hover:text-amber-300'
            }`}
          >
            <LuStar className={`w-4 h-4 ${log.favorite ? 'fill-amber-300' : ''}`} />
          </button>
          <ActionsMenu onEdit={() => onEdit(log)} onDuplicate={() => onDuplicate(log)} onDelete={() => onDelete(log)} />
        </div>
        {muscles.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {muscles.map((g) => (
              <span key={g} className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-300 border border-white/5">
                {MUSCLE_LABELS[g] || g}
              </span>
            ))}
          </div>
        )}
        {open ? (
          <button
            type="button"
            onClick={() => onResume(log)}
            disabled={resuming}
            className="w-full sm:w-auto h-11 px-5 rounded-xl bg-lime-400 hover:bg-lime-300 disabled:opacity-60 text-zinc-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-lime-400/20 active:scale-[0.98] transition"
          >
            <LuPlay className="w-4 h-4 fill-zinc-950" /> {resuming ? 'Abriendo…' : 'Reanudar sesión'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onRepeat(log)}
            className="w-full sm:w-auto h-11 px-5 rounded-xl bg-lime-400 hover:bg-lime-300 text-zinc-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-lime-400/20 active:scale-[0.98] transition"
          >
            <LuPlay className="w-4 h-4 fill-zinc-950" /> Repetir esta sesión
          </button>
        )}
      </header>

      {/* Summary */}
      <section aria-label="Resumen" className="grid grid-cols-2 sm:grid-cols-3 2xl:grid-cols-6 gap-x-4 gap-y-3 py-4 border-y border-white/5">
        <Stat Icon={LuClock} label="Duración" value={minutes > 0 ? formatMinutes(minutes) : '—'} accent="text-cyan-400" />
        <Stat Icon={LuDumbbell} label="Ejercicios" value={exercises.length} />
        <Stat Icon={LuLayers} label="Series" value={totalSets(log)} accent="text-emerald-400" />
        <Stat Icon={LuWeight} label="Volumen" value={totalVolume(log) > 0 ? formatKg(totalVolume(log)) : '—'} accent="text-amber-400" />
        <Stat Icon={LuFlame} label="Calorías" value={log.caloriesBurned > 0 ? fmtNum(log.caloriesBurned) : '—'} accent="text-orange-400" />
        <Stat Icon={FeelingIcon} label="Sensación" value={feeling.l} />
      </section>

      {/* Unfinished: what was left to do */}
      {pending.length > 0 && (
        <section aria-label="Ejercicios pendientes" className="space-y-2 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3">
          <h3 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-300">
            <LuCircleDashed className="w-3.5 h-3.5" aria-hidden="true" /> Pendiente
          </h3>
          <ul className="flex flex-wrap gap-1.5">
            {pending.map((p, i) => (
              <li key={i} className="text-xs text-zinc-200 bg-zinc-900 border border-white/10 rounded-lg px-2 py-1">
                {p.name} <span className="font-mono text-zinc-500">{p.done}/{p.total}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Exercises */}
      <section aria-label="Ejercicios" className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400">Ejercicios</h3>

        {/* Wide screens: table */}
        <div className="hidden md:block overflow-hidden rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/80 text-[11px] uppercase tracking-wider text-zinc-500">
              <tr>
                <th scope="col" className="text-left font-bold px-4 py-2.5">Ejercicio</th>
                <th scope="col" className="text-left font-bold px-4 py-2.5">Series (kg × reps)</th>
                <th scope="col" className="text-left font-bold px-4 py-2.5">Mejor serie</th>
                <th scope="col" className="text-left font-bold px-4 py-2.5">vs. anterior</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {exercises.map((ex, i) => {
                const best = topSet(ex.sets);
                const prev = previous.get(exerciseKey(ex));
                return (
                  <tr key={i} className="align-top">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-white">{ex.exercise?.name || 'Ejercicio'}</p>
                      {ex.exercise?.muscleGroup && (
                        <p className="text-xs text-zinc-500">{MUSCLE_LABELS[ex.exercise.muscleGroup] || ex.exercise.muscleGroup}</p>
                      )}
                      <RestLine exercise={ex} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {(ex.sets || []).map((s, si) => (
                          <span
                            key={si}
                            title={s.completed === false ? 'Serie no completada' : undefined}
                            className={`font-mono text-xs border rounded-md px-2 py-0.5 ${s.completed === false ? 'border-dashed border-white/15 text-zinc-500' : 'bg-zinc-800 border-white/5 text-zinc-200'}`}
                          >
                            {fmtNum(s.weight)} × {s.reps}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-white whitespace-nowrap">
                      {best ? `${fmtNum(best.weight)} kg × ${best.reps}` : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {previousReady && <ProgressBadge current={best} previous={prev} />}
                      {prev && <p className="text-[11px] text-zinc-500 mt-0.5">antes {fmtNum(prev.weight)} kg × {prev.reps}</p>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile: stacked */}
        <ul className="md:hidden divide-y divide-white/5 rounded-xl border border-white/10">
          {exercises.map((ex, i) => {
            const best = topSet(ex.sets);
            const prev = previous.get(exerciseKey(ex));
            return (
              <li key={i} className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">{ex.exercise?.name || 'Ejercicio'}</p>
                    <p className="text-xs text-zinc-500">
                      {(ex.sets || []).length} series{best ? ` · mejor ${fmtNum(best.weight)} kg × ${best.reps}` : ''}
                    </p>
                    <RestLine exercise={ex} />
                  </div>
                  {previousReady && <ProgressBadge current={best} previous={prev} />}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(ex.sets || []).map((s, si) => (
                    <span
                      key={si}
                      title={s.completed === false ? 'Serie no completada' : undefined}
                      className={`font-mono text-xs border rounded-md px-2 py-0.5 ${s.completed === false ? 'border-dashed border-white/15 text-zinc-500' : 'bg-zinc-800 border-white/5 text-zinc-200'}`}
                    >
                      {fmtNum(s.weight)} × {s.reps}
                    </span>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {userNotes && (
        <section aria-label="Notas" className="space-y-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400">Notas</h3>
          <p className="text-sm text-zinc-300 whitespace-pre-line pl-3 border-l-2 border-lime-400/40">{userNotes}</p>
        </section>
      )}
    </article>
  );
}

export default memo(SessionDetail);
