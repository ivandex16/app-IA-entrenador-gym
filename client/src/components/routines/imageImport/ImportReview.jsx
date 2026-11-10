import { memo, useMemo, useState } from 'react';
import { LuTriangleAlert, LuTrash2, LuPlus, LuListPlus, LuCheck, LuChevronDown, LuInfo, LuImageUp } from 'react-icons/lu';
import ImageTips from './ImageTips';
import ExercisePicker from './ExercisePicker';
import { emptyRow, newRowId, updateRow, validate } from './reviewModel';

const GOALS = [
  ['general', 'General'], ['muscle_gain', 'Ganar músculo'], ['fat_loss', 'Perder grasa'],
  ['endurance', 'Resistencia'], ['toning', 'Tonificación'], ['strength', 'Fuerza'],
];

const FIELDS = [
  { key: 'sets', label: 'Series', mode: 'numeric', placeholder: '—', required: true },
  { key: 'repsMin', label: 'Reps', mode: 'numeric', placeholder: '—', required: true, review: 'reps' },
  { key: 'repsMax', label: 'Hasta', mode: 'numeric', placeholder: 'opc.', review: 'reps' },
  { key: 'weight', label: 'Peso (kg)', mode: 'decimal', placeholder: 'Agregar' },
  { key: 'restSeconds', label: 'Descanso (s)', mode: 'numeric', placeholder: 'Agregar' },
  { key: 'rir', label: 'RIR', mode: 'text', placeholder: '—' },
  { key: 'rpe', label: 'RPE', mode: 'decimal', placeholder: '—' },
  { key: 'tempo', label: 'Tempo', mode: 'text', placeholder: '—' },
];

/* How the image was read (helps to understand a sheet that wasn't split into days). */
const READ_REASONS = {
  'word-columns': 'por columnas detectadas en el texto',
  panels: 'panel por panel',
  'no-panels': 'como una sola página (no se detectaron paneles separados)',
  'not-days': 'como una sola página (los paneles no parecían días de ejercicios)',
  'pixel-error': 'como una sola página (falló la detección de paneles)',
  'panel-error': 'como una sola página (falló la lectura por paneles)',
};
export function readModeText(d) {
  const how = READ_REASONS[d.reason] || 'como una sola página';
  return `Lectura: ${how}${d.panels ? ` · ${d.panels} paneles` : ''} · imagen ${d.image}${d.error ? ` · ${d.error}` : ''}`;
}

const ReviewTag = () => (
  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-300">
    <LuTriangleAlert className="w-3 h-3" aria-hidden="true" /> Revisar
  </span>
);

const ExerciseCard = memo(function ExerciseCard({ row, index, errors, showErrors, catalog, onChange, onRemove, onCreateExercise }) {
  const set = (patch) => onChange(row.id, patch);
  const err = showErrors ? errors || {} : {};
  return (
    <li className={`rounded-2xl border p-3 sm:p-4 space-y-3 ${row.review.length ? 'border-amber-400/25 bg-amber-400/[0.03]' : 'border-white/10 bg-zinc-900/60'}`}>
      <div className="flex items-start gap-2">
        <span className="mt-2 w-6 h-6 shrink-0 rounded-lg bg-zinc-800 text-xs font-black text-zinc-300 flex items-center justify-center">{index + 1}</span>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <ExercisePicker
              value={row.exerciseId}
              selectedLabel={row.exerciseName}
              candidates={row.candidates}
              catalog={catalog}
              detectedName={row.detectedName}
              invalid={Boolean(err.exerciseId)}
              flagged={row.review.includes('exercise')}
              onChange={(id) => set({ exerciseId: id, exerciseName: catalog.find((e) => e._id === id)?.name || row.candidates.find((c) => c._id === id)?.name || '' })}
              onCreate={(name, muscle) => onCreateExercise(row.id, name, muscle)}
            />
            <button type="button" onClick={() => onRemove(row.id)} aria-label="Eliminar ejercicio" className="w-10 h-10 shrink-0 rounded-xl border border-white/10 text-zinc-400 hover:text-rose-300 hover:border-rose-400/40 flex items-center justify-center">
              <LuTrash2 className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] text-zinc-500 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {row.sourceText ? <span className="truncate max-w-full">Leído: “{row.sourceText}”</span> : <span>Añadido a mano</span>}
            {row.superset && <span className="font-bold text-violet-300">Superserie {row.superset}</span>}
            {row.review.includes('exercise') && (
              row.matchStatus === 'none'
                ? <span className="text-amber-300 font-semibold">No está en el catálogo: elige uno o créalo</span>
                : row.approx
                  ? <span className="text-amber-300 font-semibold">Coincidencia aproximada: comprueba</span>
                  : <span className="text-amber-300 font-semibold">Varias opciones posibles</span>
            )}
            {err.exerciseId && <span className="text-rose-300 font-semibold">{err.exerciseId}</span>}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {FIELDS.map((f) => {
          const flagged = row.review.includes(f.review || f.key);
          const error = err[f.key];
          return (
            <label key={f.key} className="min-w-0">
              <span className="flex items-center justify-between gap-1 text-[10px] font-bold uppercase tracking-wide text-zinc-400 mb-1">
                <span className="truncate">{f.label}{f.required && <span className="text-zinc-600">*</span>}</span>
                {flagged && !error && <ReviewTag />}
              </span>
              <input
                value={row[f.key]}
                inputMode={f.mode}
                placeholder={f.placeholder}
                onChange={(e) => set({ [f.key]: e.target.value })}
                aria-invalid={Boolean(error) || undefined}
                className={`w-full h-9 bg-zinc-950 border rounded-lg px-2 text-sm font-semibold text-white tabular-nums outline-none placeholder:text-zinc-600 placeholder:font-normal focus:border-lime-400/60 ${
                  error ? 'border-rose-500/60' : flagged ? 'border-amber-400/60' : 'border-white/10'
                }`}
              />
              {error && <span className="block mt-0.5 text-[10px] text-rose-300 truncate">{error}</span>}
            </label>
          );
        })}
      </div>
      <input
        value={row.notes}
        onChange={(e) => set({ notes: e.target.value })}
        placeholder="Notas (opcional)"
        aria-label="Notas"
        className="w-full h-9 bg-zinc-950 border border-white/10 rounded-lg px-2.5 text-sm text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-lime-400/60"
      />
    </li>
  );
});

/*
 * "Revisar rutina importada": everything detected is editable, doubtful fields
 * are marked, and nothing is saved until the user presses "Crear rutina".
 */
function ImportReview({ state, setState, catalog, previewUrl, saving, onCreateExercise, onSave, onCancel, onRetry }) {
  const [showErrors, setShowErrors] = useState(false);
  // The original image sits beside the list on wide screens; on phones it starts folded.
  const [imageOpen, setImageOpen] = useState(() => window.matchMedia('(min-width: 1024px)').matches);
  const check = useMemo(() => validate(state), [state]);
  const all = state.days.flatMap((d) => d.exercises);
  const toReview = all.filter((r) => r.review.length > 0).length;

  const patchRow = (id, patch) =>
    setState((s) => ({ ...s, days: s.days.map((d) => ({ ...d, exercises: d.exercises.map((r) => (r.id === id ? updateRow(r, patch) : r)) })) }));
  const removeRow = (id) => setState((s) => ({ ...s, days: s.days.map((d) => ({ ...d, exercises: d.exercises.filter((r) => r.id !== id) })) }));
  const addRow = (dayId) => setState((s) => ({ ...s, days: s.days.map((d) => (d.id === dayId ? { ...d, exercises: [...d.exercises, emptyRow()] } : d)) }));
  const addDay = () => setState((s) => ({ ...s, days: [...s.days, { id: newRowId(), label: `Día ${s.days.length + 1}`, exercises: [emptyRow()] }] }));
  const patchDay = (id, patch) => setState((s) => ({ ...s, days: s.days.map((d) => (d.id === id ? { ...d, ...patch } : d)) }));
  const removeDay = (id) => setState((s) => ({ ...s, days: s.days.filter((d) => d.id !== id) }));

  const save = () => {
    setShowErrors(true);
    if (check.ok) onSave();
  };

  return (
    <div className="space-y-5">
      {state.warning && (
        <div role="alert" className="rounded-xl border border-amber-400/30 bg-amber-400/[0.06] p-3 sm:p-4 space-y-2">
          <p className="text-sm font-semibold text-amber-200 flex items-start gap-2"><LuTriangleAlert className="w-4 h-4 mt-0.5 shrink-0" /> {state.warning.message}</p>
          {state.warning.hint && <p className="text-xs text-zinc-300">{state.warning.hint}</p>}
          <ImageTips />
          {onRetry && (
            <button type="button" onClick={onRetry} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-lime-400 hover:bg-lime-300 text-zinc-950 text-xs font-black">
              <LuImageUp className="w-4 h-4" /> Probar con otra imagen
            </button>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-200 font-bold">{all.length} {all.length === 1 ? 'ejercicio detectado' : 'ejercicios detectados'}</span>
        {toReview > 0 ? (
          <span className="px-2.5 py-1 rounded-lg bg-amber-400/10 border border-amber-400/25 text-amber-200 font-bold inline-flex items-center gap-1">
            <LuTriangleAlert className="w-3.5 h-3.5" /> {toReview} para revisar
          </span>
        ) : (
          <span className="px-2.5 py-1 rounded-lg bg-emerald-400/10 border border-emerald-400/25 text-emerald-200 font-bold inline-flex items-center gap-1">
            <LuCheck className="w-3.5 h-3.5" /> Todo reconocido
          </span>
        )}
        <span className="text-zinc-500 inline-flex items-center gap-1"><LuInfo className="w-3.5 h-3.5" /> Lo que no aparece en la imagen queda vacío: complétalo si quieres.</span>
      </div>
      {state.diagnostics && <p className="text-[11px] text-zinc-500" data-testid="read-mode">{readModeText(state.diagnostics)}</p>}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
        {previewUrl && (
          <details
            className="lg:block group rounded-2xl border border-white/10 bg-zinc-950/60 overflow-hidden self-start lg:sticky lg:top-24"
            open={imageOpen}
            onToggle={(e) => setImageOpen(e.currentTarget.open)}
          >
            <summary className="lg:hidden cursor-pointer list-none px-3 py-2 text-xs font-bold text-zinc-300 flex items-center justify-between">
              Imagen original <LuChevronDown className="w-4 h-4 group-open:rotate-180 transition" />
            </summary>
            <img src={previewUrl} alt="Imagen importada" className="w-full max-h-[70vh] object-contain bg-black" />
          </details>
        )}

        <div className="space-y-5 min-w-0">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
            <label className="min-w-0">
              <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Nombre de la rutina* {state.nameReview && !state.name && <ReviewTag />}
              </span>
              <input
                value={state.name}
                onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))}
                placeholder="Ej. Torso / Pierna"
                className={`w-full h-10 bg-zinc-950 border rounded-xl px-3 text-sm font-bold text-white outline-none focus:border-lime-400/60 ${showErrors && !state.name.trim() ? 'border-rose-500/60' : 'border-white/10'}`}
              />
            </label>
            <label>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Objetivo</span>
              <select
                value={state.goal}
                onChange={(e) => setState((s) => ({ ...s, goal: e.target.value }))}
                className="w-full h-10 bg-zinc-950 border border-white/10 rounded-xl px-3 text-sm font-semibold text-zinc-200 outline-none"
              >
                {GOALS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
          </div>

          {state.days.map((day) => (
            <section key={day.id} className="space-y-3" aria-label={day.label}>
              <div className="flex items-center gap-2">
                <input
                  value={day.label}
                  onChange={(e) => patchDay(day.id, { label: e.target.value })}
                  aria-label="Nombre del día"
                  className="flex-1 min-w-0 h-9 bg-transparent border-b border-white/10 focus:border-lime-400/60 text-sm font-black uppercase tracking-wider text-lime-300 outline-none"
                />
                {state.days.length > 1 && (
                  <button type="button" onClick={() => removeDay(day.id)} className="text-xs font-bold text-zinc-500 hover:text-rose-300">Quitar día</button>
                )}
              </div>
              <ul className="space-y-3">
                {day.exercises.map((row, i) => (
                  <ExerciseCard
                    key={row.id}
                    row={row}
                    index={i}
                    errors={check.rows[row.id]}
                    showErrors={showErrors}
                    catalog={catalog}
                    onChange={patchRow}
                    onRemove={removeRow}
                    onCreateExercise={onCreateExercise}
                  />
                ))}
              </ul>
              <button type="button" onClick={() => addRow(day.id)} className="w-full h-10 rounded-xl border border-dashed border-white/15 hover:border-lime-400/50 text-xs font-bold text-zinc-300 hover:text-lime-300 flex items-center justify-center gap-1.5">
                <LuPlus className="w-4 h-4" /> Agregar ejercicio
              </button>
            </section>
          ))}

          <button type="button" onClick={addDay} className="text-xs font-bold text-zinc-400 hover:text-white inline-flex items-center gap-1.5">
            <LuListPlus className="w-4 h-4" /> Agregar día
          </button>

          {state.unparsed.length > 0 && (
            <details className="rounded-xl border border-white/10 bg-zinc-950/60 p-3">
              <summary className="cursor-pointer text-xs font-bold text-zinc-300">Texto que no supimos interpretar ({state.unparsed.length})</summary>
              <ul className="mt-2 space-y-1 text-xs text-zinc-400 font-mono">
                {state.unparsed.map((l, i) => <li key={i} className="break-words">{l}</li>)}
              </ul>
              <p className="mt-2 text-[11px] text-zinc-500">Si alguna línea era un ejercicio, añádelo con “Agregar ejercicio”.</p>
            </details>
          )}
        </div>
      </div>

      <div className="sticky bottom-20 lg:bottom-4 z-20 rounded-2xl border border-white/10 bg-[#0E1018]/95 backdrop-blur p-3 flex flex-wrap items-center gap-3 shadow-2xl shadow-black/60">
        <div className={`text-xs ${showErrors && check.problems.length > 0 ? 'basis-full sm:basis-auto sm:flex-1' : 'flex-1 min-w-0'}`} aria-live="polite">
          {showErrors && check.problems.length > 0 ? (
            <ul className="text-rose-300 space-y-0.5">{check.problems.map((p) => <li key={p}>{p}</li>)}</ul>
          ) : (
            <span className="hidden sm:inline text-zinc-400">La rutina se creará solo cuando pulses “Crear rutina”.</span>
          )}
        </div>
        <button type="button" onClick={onCancel} className="h-10 px-4 rounded-xl border border-white/10 text-xs font-bold text-zinc-300 hover:text-white">Descartar</button>
        <button type="button" onClick={save} disabled={saving} className="h-10 px-5 rounded-xl bg-lime-400 hover:bg-lime-300 disabled:opacity-60 text-zinc-950 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
          <LuCheck className="w-4 h-4" /> {saving ? 'Creando…' : 'Crear rutina'}
        </button>
      </div>
    </div>
  );
}

export default memo(ImportReview);
