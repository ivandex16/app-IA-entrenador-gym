import { useCallback, useEffect, useRef, useState } from 'react';
import { LuEye, LuPlus, LuCheck, LuSearch, LuX, LuExternalLink, LuLoaderCircle } from 'react-icons/lu';
import api from '../../api/axios';
import { exerciseThumb, exerciseImage } from './exerciseImages';
import { ExerciseThumb, YouTubeVideo } from './ExerciseMedia';

export const MUSCLES = [
  ['chest', 'Pecho'], ['back', 'Espalda'], ['shoulders', 'Hombros'], ['biceps', 'Bíceps'], ['triceps', 'Tríceps'],
  ['legs', 'Piernas'], ['glutes', 'Glúteos'], ['abs', 'Abdomen'], ['calves', 'Gemelos'], ['forearms', 'Antebrazos'],
  ['full_body', 'Cuerpo completo'], ['cardio', 'Cardio'],
];
const MUSCLE_LABEL = Object.fromEntries(MUSCLES);
const EQUIPMENT_LABEL = {
  barbell: 'Barra', dumbbell: 'Mancuernas', machine: 'Máquina', cable: 'Polea', bodyweight: 'Peso corporal',
  kettlebell: 'Kettlebell', band: 'Banda', other: 'Otro',
};
const LEVEL_LABEL = { beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzado' };
const PAGE = 20;

const meta = (ex) => [MUSCLE_LABEL[ex.muscleGroup] || ex.muscleGroup, EQUIPMENT_LABEL[ex.equipment]].filter(Boolean).join(' · ');

/*
 * Quick look at an exercise without leaving the routine: picture, muscles, a
 * short explanation and the video (loaded only on play), plus "Agregar".
 */
function PreviewModal({ exercise, added, onAdd, onClose }) {
  const [full, setFull] = useState(null);
  const closeRef = useRef(null);
  useEffect(() => {
    let alive = true;
    api.get(`/exercises/${exercise._id}`).then((r) => alive && setFull(r.data)).catch(() => alive && setFull(exercise));
    closeRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      alive = false;
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [exercise, onClose]);

  const ex = full || exercise;
  const steps = (ex.instructions || []).slice(0, 4);
  const image = exerciseImage(ex);
  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ex.name}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto bg-zinc-900 border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-4 py-3 bg-zinc-900/95 backdrop-blur border-b border-white/10">
          <h3 className="font-black text-white truncate">{ex.name}</h3>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Cerrar" className="w-8 h-8 shrink-0 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center">
            <LuX className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          {image && <ExerciseThumb src={image} alt={ex.name} fit="contain" className="w-full aspect-video rounded-xl" />}
          {ex.youtubeVideoId && <YouTubeVideo id={ex.youtubeVideoId} title={ex.name} />}
          {!image && !ex.youtubeVideoId && <ExerciseThumb src={null} alt={ex.name} className="w-full aspect-[21/9] rounded-xl" />}

          <div className="flex flex-wrap gap-1.5 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-lime-400/10 text-lime-300 border border-lime-400/20 font-bold">{MUSCLE_LABEL[ex.muscleGroup] || ex.muscleGroup}</span>
            {(ex.secondaryMuscles || []).map((m) => (
              <span key={m} className="px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-300 border border-white/10">{MUSCLE_LABEL[m] || m}</span>
            ))}
            {ex.equipment && <span className="px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-300 border border-white/10">{EQUIPMENT_LABEL[ex.equipment] || ex.equipment}</span>}
            {ex.difficulty && <span className="px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-400 border border-white/10">{LEVEL_LABEL[ex.difficulty] || ex.difficulty}</span>}
          </div>

          {!full ? (
            <p className="text-xs text-zinc-500 flex items-center gap-1.5"><LuLoaderCircle className="w-3.5 h-3.5 animate-spin" /> Cargando explicación…</p>
          ) : (
            <>
              {ex.description && <p className="text-sm text-zinc-300 leading-relaxed line-clamp-4">{ex.description}</p>}
              {steps.length > 0 && (
                <ol className="space-y-1.5 text-sm text-zinc-300 list-decimal pl-5">
                  {steps.map((s, i) => <li key={i} className="line-clamp-2">{s}</li>)}
                </ol>
              )}
              {!ex.description && !steps.length && <p className="text-xs text-zinc-500">Sin explicación todavía para este ejercicio.</p>}
            </>
          )}
        </div>
        <div className="sticky bottom-0 flex items-center gap-2 px-4 py-3 bg-zinc-900/95 backdrop-blur border-t border-white/10">
          <a href={`/exercises/${ex._id}`} target="_blank" rel="noopener noreferrer" className="h-10 px-3 rounded-xl text-xs font-bold text-zinc-300 hover:text-white flex items-center gap-1.5">
            <LuExternalLink className="w-4 h-4" /> Ficha completa
          </a>
          <button
            type="button"
            disabled={added}
            onClick={() => { onAdd(ex); onClose(); }}
            className="ml-auto h-10 px-4 rounded-xl bg-lime-400 hover:bg-lime-300 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 text-xs font-black flex items-center gap-1.5"
          >
            {added ? <><LuCheck className="w-4 h-4" /> Ya está en este día</> : <><LuPlus className="w-4 h-4" /> Agregar a la rutina</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/*
 * Exercise picker for the routine editor: server-side search and muscle filter,
 * 20 results at a time, each with a small picture (lazy) so the user recognises
 * the movement; "Ver" opens a preview without leaving the routine.
 * No videos are loaded in the list.
 */
export default function ExercisePickerPanel({ addedIds, onAdd, inputRef }) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [muscle, setMuscle] = useState('all');
  const [state, setState] = useState({ items: [], page: 0, totalPages: 1, total: 0, status: 'loading' });
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  const load = useCallback((page, append) => {
    setState((s) => ({ ...s, status: append ? 'more' : 'loading' }));
    const params = { page, limit: PAGE };
    if (debounced) params.search = debounced;
    if (muscle !== 'all') params.muscleGroup = muscle;
    return api.get('/exercises', { params }).then(
      (r) => setState((s) => ({
        items: append ? [...s.items, ...r.data.items.filter((x) => !s.items.some((y) => y._id === x._id))] : r.data.items,
        page: r.data.page, totalPages: r.data.totalPages, total: r.data.total, status: 'ready',
      })),
      () => setState((s) => ({ ...s, status: 'error' }))
    );
  }, [debounced, muscle]);

  useEffect(() => { load(1, false); }, [load]);

  const closePreview = useCallback(() => setPreview(null), []);
  const { items, status } = state;

  return (
    <div className="animate-slideUp bg-[#0E1018] border border-white/10 rounded-2xl p-3 sm:p-5 space-y-3 shadow-2xl">
      <div className="relative">
        <LuSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          placeholder="Buscar ejercicio (ej. press, sentadilla, curl)…"
          aria-label="Buscar ejercicio"
          className="w-full bg-[#131622] rounded-xl pl-10 pr-4 py-2.5 outline-none text-sm text-white border border-white/10 focus:border-lime-400 focus:ring-1 focus:ring-lime-400/30 transition-all"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5" role="group" aria-label="Grupo muscular">
        {[['all', 'Todos'], ...MUSCLES].map(([v, l]) => (
          <button
            key={v}
            type="button"
            onClick={() => setMuscle(v)}
            aria-pressed={muscle === v}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 border ${
              muscle === v ? 'bg-lime-400 text-black border-lime-400 font-black' : 'bg-[#131622] text-zinc-400 hover:text-white border-white/[0.08]'
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      <p className="text-[11px] text-zinc-500" aria-live="polite">
        {status === 'loading' ? 'Buscando…' : status === 'error' ? 'No se pudieron cargar los ejercicios.' : `${state.total} ejercicios · pulsa “Ver” para ver cómo se hace`}
      </p>

      <ul className="max-h-[26rem] overflow-y-auto space-y-1.5 pr-1">
        {status === 'loading' && items.length === 0 &&
          Array.from({ length: 5 }, (_, i) => (
            <li key={i} className="flex items-center gap-3 p-2">
              <div className="w-14 h-14 rounded-xl bg-zinc-800/80 animate-pulse" />
              <div className="flex-1 space-y-2"><div className="h-3 w-2/3 rounded bg-zinc-800 animate-pulse" /><div className="h-2.5 w-1/3 rounded bg-zinc-800/70 animate-pulse" /></div>
            </li>
          ))}
        {status === 'ready' && items.length === 0 && (
          <li className="text-zinc-500 text-xs text-center py-6">No se encontraron ejercicios. Prueba con otro nombre o grupo muscular.</li>
        )}
        {items.map((ex) => {
          const added = addedIds.has(ex._id);
          return (
            <li key={ex._id} className={`flex items-center gap-3 rounded-xl p-2 border transition ${added ? 'bg-white/[0.02] border-white/[0.04]' : 'bg-[#131622] border-white/[0.06] hover:border-lime-400/30'}`}>
              <button type="button" onClick={() => setPreview(ex)} className="shrink-0 rounded-xl overflow-hidden" aria-label={`Ver ${ex.name}`}>
                <ExerciseThumb src={exerciseThumb(ex)} alt={ex.name} size="sm" className="w-14 h-14 rounded-xl" />
              </button>
              <div className="flex-1 min-w-0">
                <p className={`font-bold text-sm truncate ${added ? 'text-zinc-500' : 'text-white'}`}>{ex.name}</p>
                <p className="text-[11px] text-zinc-400 truncate">{meta(ex)}</p>
              </div>
              <button type="button" onClick={() => setPreview(ex)} className="h-9 px-2.5 rounded-lg border border-white/10 text-zinc-300 hover:text-white text-xs font-bold flex items-center gap-1 shrink-0">
                <LuEye className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Ver</span>
              </button>
              {added ? (
                <span className="text-[11px] font-bold text-zinc-500 shrink-0 w-9 text-center" title="Ya está en este día"><LuCheck className="w-4 h-4 mx-auto" /></span>
              ) : (
                <button type="button" onClick={() => onAdd(ex)} aria-label={`Agregar ${ex.name}`} className="w-9 h-9 shrink-0 rounded-lg bg-lime-400/10 text-lime-400 border border-lime-400/20 hover:bg-lime-400 hover:text-zinc-950 flex items-center justify-center transition">
                  <LuPlus className="w-4 h-4" />
                </button>
              )}
            </li>
          );
        })}
        {status !== 'loading' && state.page < state.totalPages && (
          <li className="pt-1">
            <button type="button" onClick={() => load(state.page + 1, true)} disabled={status === 'more'} className="w-full h-9 rounded-lg border border-dashed border-white/15 text-xs font-bold text-zinc-300 hover:text-white disabled:opacity-60">
              {status === 'more' ? 'Cargando…' : `Ver más (${state.total - items.length} restantes)`}
            </button>
          </li>
        )}
      </ul>

      {preview && <PreviewModal exercise={preview} added={addedIds.has(preview._id)} onAdd={onAdd} onClose={closePreview} />}
    </div>
  );
}
