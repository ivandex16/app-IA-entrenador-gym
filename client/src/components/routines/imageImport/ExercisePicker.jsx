import { memo, useState } from 'react';
import { LuPlus, LuX } from 'react-icons/lu';

export const MUSCLE_OPTIONS = [
  ['chest', 'Pecho'], ['back', 'Espalda'], ['shoulders', 'Hombros'], ['biceps', 'Bíceps'], ['triceps', 'Tríceps'],
  ['legs', 'Piernas'], ['glutes', 'Glúteos'], ['abs', 'Abdomen'], ['forearms', 'Antebrazos'], ['calves', 'Gemelos'],
  ['full_body', 'Cuerpo completo'], ['cardio', 'Cardio'],
];
const NEW = '__new__';

/*
 * Exercise selector for one imported row: suggestions first, then the whole
 * catalog, and "Crear ejercicio nuevo…" (only on the user's explicit action).
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
    <select
      value={value}
      onChange={(e) => {
        if (e.target.value === NEW) {
          setName(detectedName || '');
          setCreating(true);
        } else onChange(e.target.value);
      }}
      aria-label="Ejercicio"
      aria-invalid={invalid || undefined}
      className={`flex-1 min-w-0 h-10 bg-zinc-900 border ${border} rounded-xl px-3 text-sm font-semibold text-white outline-none focus:border-lime-400/60`}
    >
      <option value="">{candidates.length ? 'Elige entre las sugerencias…' : 'Elige un ejercicio…'}</option>
      {value && selectedLabel && !catalog.some((e) => e._id === value) && !suggestionIds.has(value) && (
        <option value={value}>{selectedLabel}</option>
      )}
      {candidates.length > 0 && (
        <optgroup label="Sugerencias">
          {candidates.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </optgroup>
      )}
      <optgroup label="Todos los ejercicios">
        {rest.map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}
      </optgroup>
      <option value={NEW}>+ Crear ejercicio nuevo…</option>
    </select>
  );
}

export default memo(ExercisePicker);
