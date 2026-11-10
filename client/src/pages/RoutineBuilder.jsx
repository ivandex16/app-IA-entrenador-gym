import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  LuArrowLeft, LuPlus, LuX, LuTrash2, LuChevronUp, LuChevronDown, LuTriangleAlert, LuCheck, LuClipboardList, LuInfo,
} from 'react-icons/lu';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import ExercisePickerPanel from '../components/exercises/ExercisePickerPanel';
import { ExerciseThumb } from '../components/exercises/ExerciseMedia';
import { exerciseThumb } from '../components/exercises/exerciseImages';
import useUnsavedChangesGuard from '../components/routines/builder/useUnsavedChangesGuard';
import {
  WEEKDAYS, emptyDraft, isDirty, toggleWeekday, addExercise, updateExercise, removeExercise, moveExercise,
  validate, toPayload, dayLabel, estimateMinutes, saveLocal, loadLocal, clearLocal,
} from '../components/routines/builder/routineDraft';

const GOALS = [
  ['general', 'General'], ['muscle_gain', 'Ganar músculo'], ['fat_loss', 'Perder grasa'],
  ['endurance', 'Resistencia'], ['toning', 'Tonificación'], ['strength', 'Fuerza'],
];
const MUSCLE = {
  chest: 'Pecho', back: 'Espalda', shoulders: 'Hombros', biceps: 'Bíceps', triceps: 'Tríceps', legs: 'Piernas',
  glutes: 'Glúteos', abs: 'Abdomen', calves: 'Gemelos', forearms: 'Antebrazos', full_body: 'Cuerpo completo', cardio: 'Cardio',
};
const FIELDS = [
  { k: 'sets', l: 'Series', mode: 'numeric' },
  { k: 'repsMin', l: 'Reps', mode: 'numeric' },
  { k: 'repsMax', l: 'Hasta', mode: 'numeric', ph: 'opc.' },
  { k: 'weight', l: 'Peso (kg)', mode: 'decimal', ph: '—' },
  { k: 'restSeconds', l: 'Descanso (s)', mode: 'numeric', ph: '—' },
];
const input = 'w-full h-9 bg-zinc-950 border rounded-lg px-2 text-sm font-semibold text-white tabular-nums outline-none placeholder:text-zinc-600 focus:border-lime-400/60';

function saveErrorMessage(err) {
  const data = err.response?.data;
  if (Array.isArray(data?.errors) && data.errors.length) return `No se pudo guardar: ${data.errors[0].msg}. Tus cambios siguen aquí.`;
  if (data?.message) return `${data.message} Tus cambios siguen aquí.`;
  return 'No se pudo guardar la rutina. Tus cambios siguen disponibles para que intentes nuevamente.';
}

/*
 * "Nueva rutina": the routine is built as a local draft (name → description →
 * days → exercises → values → review) and is created in the database only when
 * the user presses "Guardar rutina", in a single request. Cancelling or leaving
 * never leaves an empty routine behind.
 */
export default function RoutineBuilder() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?._id || user?.id;
  const [draft, setDraft] = useState(() => loadLocal(userId) || emptyDraft());
  const [recovered] = useState(() => Boolean(loadLocal(userId)));
  const [activeDayId, setActiveDayId] = useState(() => draft.days[0]?.id || null);
  const [showPicker, setShowPicker] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const savingRef = useRef(false);
  const pickerInputRef = useRef(null);
  const problemsRef = useRef(null);

  const dirty = isDirty(draft);
  useUnsavedChangesGuard(dirty && !saved);

  // Safety net: the draft survives a reload or a closed tab until saved or discarded.
  useEffect(() => {
    if (saved) return undefined;
    const t = setTimeout(() => saveLocal(userId, draft), 300);
    return () => clearTimeout(t);
  }, [draft, userId, saved]);

  useEffect(() => {
    if (!draft.days.some((d) => d.id === activeDayId)) setActiveDayId(draft.days[0]?.id || null);
  }, [draft.days, activeDayId]);

  const check = useMemo(() => validate(draft), [draft]);
  const activeDay = draft.days.find((d) => d.id === activeDayId) || null;
  const totalExercises = draft.days.reduce((s, d) => s + d.exercises.length, 0);

  const onAdd = useCallback((ex) => {
    if (!activeDayId) return;
    setDraft((d) => addExercise(d, activeDayId, ex));
    toast.success(`${ex.name} agregado a ${dayLabel(draft.days.find((x) => x.id === activeDayId) || {})}`, { id: 'draft-add' });
  }, [activeDayId, draft.days]);

  const onToggleDay = (weekday) => {
    const day = draft.days.find((d) => d.weekday === weekday);
    if (day && day.exercises.length > 0 && !window.confirm(`¿Quitar ${dayLabel(day)} y sus ${day.exercises.length} ejercicios del borrador?`)) return;
    setDraft((d) => {
      const next = toggleWeekday(d, weekday);
      if (!day) setActiveDayId(next.days.find((x) => x.weekday === weekday)?.id);
      return next;
    });
  };

  const cancel = () => {
    if (dirty && !window.confirm('¿Descartar esta rutina? No se ha guardado nada todavía.')) return;
    clearLocal(userId);
    setSaved(true); // nothing left to protect
    navigate('/routines');
  };

  const startOver = () => {
    if (!window.confirm('¿Empezar de cero? Se descartará el borrador recuperado.')) return;
    clearLocal(userId);
    const fresh = emptyDraft();
    setDraft(fresh);
    setActiveDayId(fresh.days[0].id);
    setShowErrors(false);
  };

  const save = async () => {
    setShowErrors(true);
    if (!check.ok) {
      problemsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (savingRef.current) return; // a double tap must not create two routines
    savingRef.current = true;
    setSaving(true);
    try {
      const { data } = await api.post('/routines', toPayload(draft));
      clearLocal(userId);
      setSaved(true);
      toast.success('Rutina creada');
      navigate(`/routines/${data._id}`, { replace: true });
    } catch (err) {
      toast.error(saveErrorMessage(err), { duration: 6000 });
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const errs = (key) => (showErrors ? check.fields[key] || {} : {});

  return (
    <div className="min-h-screen bg-[#08090D] text-zinc-100 pb-48 lg:pb-28">
      <div className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <button type="button" onClick={cancel} className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-white">
            <LuArrowLeft className="w-4 h-4" /> Rutinas
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Nueva rutina</h1>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-400/10 text-amber-300 border border-amber-400/25">
              Borrador · aún no guardada
            </span>
          </div>
          <p className="text-sm text-zinc-400">Arma la rutina completa; solo se creará cuando pulses <strong className="text-zinc-200">Guardar rutina</strong>.</p>
          {recovered && (
            <p className="text-xs text-sky-300 flex flex-wrap items-center gap-2">
              <LuInfo className="w-3.5 h-3.5" /> Recuperamos el borrador que dejaste sin guardar.
              <button type="button" onClick={startOver} className="font-bold underline underline-offset-2 hover:text-sky-200">Empezar de cero</button>
            </p>
          )}
        </div>

        {/* 1. Name, description, goal */}
        <section className="bg-zinc-900 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4" aria-label="Datos de la rutina">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Nombre*</span>
            <input
              value={draft.name}
              maxLength={100}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="Ej: Push Day, Pierna potencia, Torso hipertrofia…"
              aria-invalid={showErrors && Boolean(check.nameError)}
              className={`mt-1.5 w-full bg-zinc-950 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none border focus:border-lime-400 ${showErrors && check.nameError ? 'border-rose-500/60' : 'border-white/10'}`}
            />
            {showErrors && check.nameError && <span className="text-xs text-rose-300 mt-1 block">{check.nameError}</span>}
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Descripción</span>
            <textarea
              value={draft.description}
              maxLength={1000}
              rows={2}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              placeholder="Ej: Enfoque en press con mancuernas y aislamiento de tríceps."
              className="mt-1.5 w-full bg-zinc-950 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none border border-white/10 focus:border-lime-400 resize-none"
            />
          </label>
          <div className="grid sm:grid-cols-[1fr_220px] gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Días</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-label="Días de entrenamiento">
                {WEEKDAYS.map((w) => {
                  const on = draft.days.some((d) => d.weekday === w.v);
                  return (
                    <button
                      key={w.v}
                      type="button"
                      aria-pressed={on}
                      onClick={() => onToggleDay(w.v)}
                      className={`min-h-[36px] px-3 rounded-xl text-xs font-bold border transition ${on ? 'bg-lime-400 text-black border-lime-400' : 'bg-zinc-950 border-white/10 text-zinc-400 hover:text-white'}`}
                    >
                      {w.l}
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Objetivo</span>
              <select
                value={draft.goal}
                onChange={(e) => setDraft((d) => ({ ...d, goal: e.target.value }))}
                className="mt-1.5 w-full h-10 bg-zinc-950 rounded-xl px-3 text-sm text-white outline-none border border-white/10 focus:border-lime-400"
              >
                {GOALS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
          </div>
        </section>

        {/* 2. Exercises per day */}
        <section className="space-y-3" aria-label="Ejercicios">
          {draft.days.length > 0 ? (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar" role="tablist" aria-label="Día">
              {draft.days.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  role="tab"
                  aria-selected={d.id === activeDayId}
                  onClick={() => { setActiveDayId(d.id); setShowPicker(false); }}
                  className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-black border transition ${d.id === activeDayId ? 'bg-zinc-100 text-zinc-950 border-zinc-100' : 'bg-zinc-900 text-zinc-300 border-white/10 hover:text-white'}`}
                >
                  {dayLabel(d)} <span className="text-zinc-500">· {d.exercises.length}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-400">Elige al menos un día arriba para empezar a agregar ejercicios.</p>
          )}

          {activeDay && (
            <>
              {activeDay.exercises.length === 0 && !showPicker && (
                <div className="text-center py-10 bg-zinc-900/60 border border-dashed border-white/10 rounded-2xl space-y-2 px-4">
                  <LuClipboardList className="w-7 h-7 text-zinc-500 mx-auto" />
                  <p className="text-sm font-bold text-zinc-300">{dayLabel(activeDay)} todavía no tiene ejercicios</p>
                  <p className="text-xs text-zinc-500">Busca en el catálogo; pulsa “Ver” si no conoces un ejercicio.</p>
                </div>
              )}

              <ol className="space-y-2.5">
                {activeDay.exercises.map((row, i) => {
                  const e = errs(row.key);
                  return (
                    <li key={row.key} className={`bg-zinc-900 border rounded-2xl p-3 sm:p-4 space-y-3 ${Object.keys(e).length ? 'border-rose-500/40' : 'border-white/10'}`}>
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 shrink-0 rounded-lg bg-lime-400 text-zinc-950 text-xs font-black flex items-center justify-center">{i + 1}</span>
                        <ExerciseThumb src={exerciseThumb(row.exercise)} alt={row.exercise.name} size="sm" className="w-11 h-11 rounded-xl shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-white truncate">{row.exercise.name}</p>
                          <p className="text-[11px] text-zinc-400">{MUSCLE[row.exercise.muscleGroup] || row.exercise.muscleGroup}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button type="button" onClick={() => setDraft((d) => moveExercise(d, activeDay.id, row.key, -1))} disabled={i === 0} aria-label="Subir" className="w-8 h-8 rounded-lg border border-white/10 text-zinc-400 hover:text-white disabled:opacity-30 flex items-center justify-center"><LuChevronUp className="w-4 h-4" /></button>
                          <button type="button" onClick={() => setDraft((d) => moveExercise(d, activeDay.id, row.key, 1))} disabled={i === activeDay.exercises.length - 1} aria-label="Bajar" className="w-8 h-8 rounded-lg border border-white/10 text-zinc-400 hover:text-white disabled:opacity-30 flex items-center justify-center"><LuChevronDown className="w-4 h-4" /></button>
                          <button type="button" onClick={() => setDraft((d) => removeExercise(d, activeDay.id, row.key))} aria-label={`Quitar ${row.exercise.name}`} className="w-8 h-8 rounded-lg border border-white/10 text-zinc-400 hover:text-rose-300 hover:border-rose-400/40 flex items-center justify-center"><LuTrash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {FIELDS.map((f) => (
                          <label key={f.k} className="min-w-0">
                            <span className="block text-[10px] font-bold uppercase tracking-wide text-zinc-400 mb-1 truncate">{f.l}</span>
                            <input
                              value={row[f.k]}
                              inputMode={f.mode}
                              placeholder={f.ph}
                              onChange={(ev) => setDraft((d) => updateExercise(d, activeDay.id, row.key, { [f.k]: ev.target.value }))}
                              aria-invalid={Boolean(e[f.k]) || undefined}
                              className={`${input} ${e[f.k] ? 'border-rose-500/60' : 'border-white/10'}`}
                            />
                            {e[f.k] && <span className="block mt-0.5 text-[10px] text-rose-300 truncate">{e[f.k]}</span>}
                          </label>
                        ))}
                      </div>
                      <input
                        value={row.notes}
                        maxLength={500}
                        onChange={(ev) => setDraft((d) => updateExercise(d, activeDay.id, row.key, { notes: ev.target.value }))}
                        placeholder="Notas (opcional): tempo, RIR, agarre…"
                        aria-label="Notas"
                        className={`${input} border-white/10 font-normal`}
                      />
                    </li>
                  );
                })}
              </ol>

              <button
                type="button"
                onClick={() => { setShowPicker((s) => !s); setTimeout(() => pickerInputRef.current?.focus(), 80); }}
                className="w-full h-11 rounded-xl border border-dashed border-white/20 hover:border-lime-400/50 text-sm font-bold text-zinc-200 hover:text-lime-300 flex items-center justify-center gap-2"
              >
                {showPicker ? <><LuX className="w-4 h-4" /> Cerrar catálogo</> : <><LuPlus className="w-4 h-4" /> Agregar ejercicio a {dayLabel(activeDay)}</>}
              </button>
              {showPicker && (
                <ExercisePickerPanel
                  inputRef={pickerInputRef}
                  addedIds={new Set(activeDay.exercises.map((x) => x.exercise._id))}
                  onAdd={onAdd}
                />
              )}
            </>
          )}
        </section>

        {/* 3. Review */}
        <section ref={problemsRef} className="bg-zinc-900 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3" aria-label="Revisión">
          <h2 className="text-xs font-black uppercase tracking-wider text-zinc-400">Revisión</h2>
          <ul className="grid sm:grid-cols-2 gap-2 text-sm">
            {draft.days.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2 rounded-xl bg-zinc-950 border border-white/5 px-3 py-2">
                <span className="font-bold text-zinc-200">{dayLabel(d)}</span>
                <span className="text-xs text-zinc-400">{d.exercises.length} {d.exercises.length === 1 ? 'ejercicio' : 'ejercicios'}{d.exercises.length > 0 && ` · ~${estimateMinutes(d)} min`}</span>
              </li>
            ))}
          </ul>
          {check.ok ? (
            <p className="text-xs text-emerald-300 flex items-center gap-1.5"><LuCheck className="w-4 h-4" /> Lista para guardar: {totalExercises} {totalExercises === 1 ? 'ejercicio' : 'ejercicios'} en {draft.days.length} {draft.days.length === 1 ? 'día' : 'días'}.</p>
          ) : (
            <ul className={`text-xs space-y-1 ${showErrors ? 'text-rose-300' : 'text-zinc-500'}`} aria-live="polite">
              {check.problems.map((p) => <li key={p} className="flex items-start gap-1.5"><LuTriangleAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {p}</li>)}
            </ul>
          )}
        </section>
      </div>

      {/* Actions */}
      <div className="fixed bottom-[88px] lg:bottom-0 inset-x-0 z-30 border-t border-white/10 bg-[#0B0C11]/95 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button type="button" onClick={cancel} disabled={saving} className="h-11 px-4 rounded-xl border border-white/10 text-sm font-bold text-zinc-300 hover:text-white disabled:opacity-50">
            Cancelar
          </button>
          <span className="hidden sm:block flex-1 text-xs text-zinc-500 truncate">
            {dirty ? 'Borrador sin guardar' : 'Empieza poniendo un nombre y agregando ejercicios'}
          </span>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="ml-auto h-11 px-6 rounded-xl bg-lime-400 hover:bg-lime-300 disabled:opacity-60 disabled:cursor-wait text-zinc-950 text-sm font-black flex items-center gap-2"
          >
            {saving ? 'Guardando…' : <><LuCheck className="w-4 h-4" /> Guardar rutina</>}
          </button>
        </div>
      </div>
    </div>
  );
}
