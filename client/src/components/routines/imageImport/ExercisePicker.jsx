import { memo, useEffect, useId, useMemo, useRef, useState } from 'react';
import { LuPlus, LuX, LuChevronDown, LuSearch, LuCheck } from 'react-icons/lu';
import { searchExercises } from './exerciseSearch';

export const MUSCLE_OPTIONS = [
  ['chest', 'Pecho'], ['back', 'Espalda'], ['shoulders', 'Hombros'], ['biceps', 'Bíceps'], ['triceps', 'Tríceps'],
  ['legs', 'Piernas'], ['glutes', 'Glúteos'], ['abs', 'Abdomen'], ['forearms', 'Antebrazos'], ['calves', 'Gemelos'],
  ['full_body', 'Cuerpo completo'], ['cardio', 'Cardio'],
];

const MUSCLE_LABEL = Object.fromEntries(MUSCLE_OPTIONS);
const LIMIT = 60; // rows rendered at once: the catalog can have 600+ exercises

/*
 * Exercise selector for one imported row: a searchable list with the
 * suggestions first, then the whole catalog, and "Crear ejercicio nuevo…"
 * (only on the user's explicit action). Keyboard: ↑ ↓ Enter Esc.
 */
function ExercisePicker({ value, selectedLabel, candidates, catalog, detectedName, invalid, flagged, onChange, onCreate }) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [muscle, setMuscle] = useState('full_body');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const suggestionIds = new Set(candidates.map((c) => c._id));
  const rest = catalog.filter((e) => !suggestionIds.has(e._id));
  const border = invalid ? 'border-rose-500/60' : flagged ? 'border-amber-400/60' : 'border-white/10';

  const submit = async () => {
    if (name.trim().length < 2) return setError('Escribe un nombre');
    setBusy(true);
    setError('');
    try {
      await onCreate(name.trim(), muscle);
      setCreating(false);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo crear');
    } finally {
      setBusy(false);
    }
  };

  if (creating) {
    return (
      <div className="flex-1 min-w-0 rounded-xl border border-lime-400/30 bg-lime-400/5 p-2 space-y-2">
        <div className="flex flex-wrap gap-2">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre del ejercicio"
            aria-label="Nombre del ejercicio nuevo"
            className="flex-1 min-w-[10rem] h-9 bg-zinc-900 border border-white/10 rounded-lg px-2.5 text-sm text-white outline-none focus:border-lime-400/60"
          />
          <select
            value={muscle}
            onChange={(e) => setMuscle(e.target.value)}
            aria-label="Grupo muscular"
            className="h-9 bg-zinc-900 border border-white/10 rounded-lg px-2 text-xs font-semibold text-zinc-200 outline-none"
          >
            {MUSCLE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={submit} disabled={busy} className="h-8 px-3 rounded-lg bg-lime-400 hover:bg-lime-300 disabled:opacity-60 text-zinc-950 text-xs font-black flex items-center gap-1">
            <LuPlus className="w-3.5 h-3.5" /> {busy ? 'Creando…' : 'Crear y usar'}
          </button>
          <button type="button" onClick={() => setCreating(false)} className="h-8 px-2 rounded-lg text-xs font-bold text-zinc-400 hover:text-white flex items-center gap-1">
            <LuX className="w-3.5 h-3.5" /> Cancelar
          </button>
          {error && <span className="text-xs text-rose-300">{error}</span>}
        </div>
      </div>
    );
  }

  return (
    <Combobox
      value={value}
      selectedLabel={selectedLabel || catalog.find((e) => e._id === value)?.name || candidates.find((c) => c._id === value)?.name || ''}
      candidates={candidates}
      rest={rest}
      border={border}
      invalid={invalid}
      placeholder={candidates.length ? 'Elige entre las sugerencias…' : 'Elige un ejercicio…'}
      onChange={onChange}
      onCreate={(query) => {
        setName(query || detectedName || '');
        setCreating(true);
      }}
    />
  );
}

function Combobox({ value, selectedLabel, candidates, rest, border, invalid, placeholder, onChange, onCreate }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const boxRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const listId = useId();

  // Suggestions first (when they match), then the rest of the catalog.
  const { items, more } = useMemo(() => {
    const sug = searchExercises(candidates, query, LIMIT).map((e) => ({ ...e, suggested: true }));
    const all = searchExercises(rest, query, LIMIT + 1);
    return { items: [...sug, ...all].slice(0, LIMIT), more: sug.length + all.length > LIMIT };
  }, [candidates, rest, query]);
  const createIndex = items.length; // last row: "Crear ejercicio nuevo"

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (!boxRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);
  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    if (open) listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const openList = () => {
    setQuery('');
    setActive(0);
    setOpen(true);
    // Room for the list: on phones the review ends behind the bottom bars.
    const r = boxRef.current?.getBoundingClientRect();
    if (r && window.innerHeight - r.bottom < 320) window.scrollBy({ top: r.top - 96, behavior: 'smooth' });
  };
  const choose = (i) => {
    if (i === createIndex) onCreate(query.trim());
    else if (items[i]) onChange(items[i]._id);
    setOpen(false);
  };
  const onKey = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(createIndex, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(active);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  };

  const firstRest = items.findIndex((e) => !e.suggested);
  const row = (i, extra) => ({
    id: `${listId}-${i}`,
    'data-index': i,
    role: 'option',
    onPointerDown: (ev) => ev.preventDefault(), // keep the focus in the search box
    onClick: () => choose(i),
    onMouseMove: () => active !== i && setActive(i),
    ...extra,
  });

  return (
    <div ref={boxRef} className="relative flex-1 min-w-0">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openList())}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={invalid || undefined}
        aria-label="Ejercicio"
        className={`w-full h-10 bg-zinc-900 border ${border} rounded-xl pl-3 pr-9 text-left text-sm font-semibold outline-none focus:border-lime-400/60 truncate ${value ? 'text-white' : 'text-zinc-300'}`}
      >
        {value ? selectedLabel || 'Ejercicio elegido' : placeholder}
        <LuChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1 rounded-xl border border-white/15 bg-zinc-900 shadow-2xl shadow-black/60 overflow-hidden">
          <div className="relative border-b border-white/10">
            <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              ref={inputRef}
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKey}
              placeholder="Buscar ejercicio…"
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-activedescendant={`${listId}-${active}`}
              aria-label="Buscar ejercicio"
              className="w-full h-10 bg-transparent pl-9 pr-3 text-sm text-white placeholder:text-zinc-500 outline-none"
            />
          </div>
          <ul ref={listRef} id={listId} role="listbox" className="max-h-[min(18rem,40vh)] overflow-y-auto py-1 text-sm">
            {items.map((e, i) => (
              <li key={`${e.suggested ? 's' : 'c'}${e._id}`}>
                {i === 0 && e.suggested && <p className="px-3 pt-1.5 pb-1 text-[10px] font-black uppercase tracking-wider text-amber-300/80">Sugerencias</p>}
                {i === firstRest && <p className="px-3 pt-1.5 pb-1 text-[10px] font-black uppercase tracking-wider text-zinc-500">{query.trim() ? 'Resultados' : 'Todos los ejercicios'}</p>}
                <div
                  {...row(i, { 'aria-selected': e._id === value })}
                  className={`mx-1 px-2.5 py-2 rounded-lg cursor-pointer flex items-center gap-2 ${i === active ? 'bg-white/10 text-white' : 'text-zinc-200'}`}
                >
                  <span className="flex-1 min-w-0 truncate">{e.name}</span>
                  {e.muscleGroup && <span className="shrink-0 text-[11px] text-zinc-500">{MUSCLE_LABEL[e.muscleGroup] || e.muscleGroup}</span>}
                  {e._id === value && <LuCheck className="w-4 h-4 shrink-0 text-lime-400" />}
                </div>
              </li>
            ))}
            {items.length === 0 && <li className="px-3 py-3 text-xs text-zinc-400">No hay ejercicios con “{query.trim()}”.</li>}
            {more && <li className="px-3 py-1.5 text-[11px] text-zinc-500">Escribe para ver más resultados…</li>}
            <li>
              <div
                {...row(createIndex, { 'aria-selected': false })}
                className={`mx-1 mt-1 px-2.5 py-2 rounded-lg cursor-pointer flex items-center gap-2 font-bold ${active === createIndex ? 'bg-lime-400/15 text-lime-200' : 'text-lime-300'}`}
              >
                <LuPlus className="w-4 h-4 shrink-0" />
                <span className="truncate">{query.trim() ? `Crear ejercicio “${query.trim()}”` : 'Crear ejercicio nuevo…'}</span>
              </div>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

export default memo(ExercisePicker);
