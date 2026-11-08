import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  LuDumbbell, LuFlame, LuCalendar, LuTrophy, LuBrain, LuZap, LuDroplets,
  LuMedal, LuTrendingUp, LuSunrise, LuGem, LuBot, LuBrickWall,
  LuTimer, LuSquare, LuHourglass,
  LuEye, LuClipboardList, LuLightbulb, LuPlus,
  LuCheck, LuTrash2, LuMinus,
  LuChevronDown
} from 'react-icons/lu';
import WorkoutHistory from '../components/workouts/WorkoutHistory';
import HistoryStats from '../components/workouts/HistoryStats';
import ElapsedTime from '../components/workouts/ElapsedTime';
import SessionBar from '../components/workouts/SessionBar';
import useRestDefaults, { normalizeRest } from '../components/workouts/useRestDefaults';
import RestConfigPanel from '../components/workouts/RestConfigPanel';
import RestDoneFlash from '../components/workouts/RestDoneFlash';
import { primeRestAudio } from '../components/workouts/restAlert';
import {
  fmtTime, fmtPreset, secondsSince, FEELINGS, todayLocalISO, localDayToInstant,
} from '../components/workouts/workoutUtils';
import { loadWorkoutDraft, saveWorkoutDraft, clearWorkoutDraft } from '../components/workouts/workoutDraft';
import { useAuth } from '../context/AuthContext';

/* Id for one workout session; sent on save so the server can ignore repeats. */
const newClientId = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

const emptyForm = () => ({
  clientId: newClientId(),
  date: todayLocalISO(),
  notes: '',
  feeling: 'good',
  exercises: [],
});

/* Readable message from a failed save (express-validator returns { errors: [...] }). */
function saveErrorMessage(err) {
  const data = err.response?.data;
  if (Array.isArray(data?.errors) && data.errors.length) {
    return `Revisa los datos: ${data.errors.map((e) => e.msg).slice(0, 2).join(', ')}`;
  }
  if (!err.response) return 'Sin conexión. Tu entreno sigue guardado aquí; vuelve a intentarlo.';
  return data?.message || 'Error al guardar';
}

const MOTIVATIONAL_MESSAGES = [
  { text: "¡Otro día, otra victoria! Cada repetición cuenta.", Icon: LuDumbbell },
  { text: "El dolor es temporal, el orgullo es para siempre.", Icon: LuFlame },
  { text: "No cuentas los días, haces que los días cuenten.", Icon: LuCalendar },
  { text: "El único entrenamiento malo es el que no se hace.", Icon: LuTrophy },
  { text: "Tu cuerpo puede hacerlo. Solo tienes que convencer a tu mente.", Icon: LuBrain },
  { text: "La disciplina supera a la motivación. ¡Y hoy lo demostraste!", Icon: LuZap },
  { text: "Cada gota de sudor es un paso más cerca de tu mejor versión.", Icon: LuDroplets },
  { text: "Los campeones entrenan cuando no tienen ganas. ¡Bien hecho!", Icon: LuMedal },
  { text: "No se trata de ser el mejor, sino de ser mejor que ayer.", Icon: LuTrendingUp },
  { text: "Hoy entrenaste. Mañana lo agradecerás.", Icon: LuSunrise },
  { text: "La fuerza no viene del cuerpo. Viene de la voluntad.", Icon: LuDumbbell },
  { text: "Cada entrenamiento es una inversión en ti mismo.", Icon: LuGem },
  { text: "¡Máquina! Otro entrenamiento completado con éxito.", Icon: LuBot },
  { text: "El hierro no miente. Tu esfuerzo se nota.", Icon: LuDumbbell },
  { text: "Roma no se construyó en un día, pero pusieron ladrillos cada día.", Icon: LuBrickWall },
];

export default function Workouts() {
  const location = useLocation();
  const { user } = useAuth();
  const draftUserId = user?._id || user?.id;

  /* ── Saved draft ──
     If the user left this page (or the app) with a workout open, pick it up
     again: every piece of session state below starts from it. */
  const [draft] = useState(() => loadWorkoutDraft(draftUserId));

  const [logs, setLogs] = useState([]);
  const [showForm, setShowForm] = useState(Boolean(draft));
  const [exercises, setExercises] = useState([]);
  const [showRestConfig, setShowRestConfig] = useState(false);
  const [form, setForm] = useState(() =>
    draft?.form ? { clientId: newClientId(), ...draft.form } : emptyForm()
  );

  /* ── Timer state ──
     Only the start timestamp lives here; <ElapsedTime> derives and renders the
     running seconds itself, so the chronometer tick doesn't re-render this page. */
  const [isActive, setIsActive] = useState(Boolean(draft?.isActive)); // workout in progress
  const [startTime, setStartTime] = useState(draft?.startTime ?? null);

  /* ── Rest durations: three layers ──
     1. restDefaults – saved on the device; edited before starting (here or on the routine screen).
     2. plannedRest  – what this workout will start with. Seeded from the routine screen
                       (navigation state) or from the defaults.
     3. sessionRest  – snapshot of plannedRest taken when the session starts. Edits made
                       while training change only this one (temporary override).
     restConfig is the value in effect right now. */
  const [restDefaults, setRestDefaults] = useRestDefaults();
  const [plannedRest, setPlannedRest] = useState(
    () => normalizeRest(location.state?.restConfig) || normalizeRest(draft?.plannedRest) || restDefaults
  );
  const [sessionRest, setSessionRest] = useState(() => normalizeRest(draft?.sessionRest));
  const restConfig = isActive && sessionRest ? sessionRest : plannedRest;

  const updateRestConfig = useCallback((next) => {
    if (isActive) {
      setSessionRest(next); // live tweak: this session only
    } else {
      setPlannedRest(next); // pre-start: becomes the plan…
      setRestDefaults(next); // …and the saved default
    }
  }, [isActive, setRestDefaults]);
  // Active rest: { type: 'set' | 'exercise', endsAt: ms timestamp, total: seconds } or null.
  // Only the end time is stored; <RestTimer> (inside <SessionBar>) renders the countdown itself.
  const [rest, setRest] = useState(draft?.rest ?? null);
  // Last natural end of a rest ({ type, at }), used to play the screen-edge glow once.
  const [restDone, setRestDone] = useState(null);

  /* ── Completed sets tracking: completedSets[exerciseIdx-setIdx] = true ── */
  const [completedSets, setCompletedSets] = useState(() => draft?.completedSets || {});
  // Latest value, readable synchronously by event handlers (see completeSet).
  const completedSetsRef = useRef(completedSets);
  completedSetsRef.current = completedSets;

  /* ── Exercise preview modal ── */
  const [previewExercise, setPreviewExercise] = useState(null);

  /* ── Motivational modal ── */
  const [motivationalMsg, setMotivationalMsg] = useState(null);
  const [workoutSummary, setWorkoutSummary] = useState(null);

  const load = () => api.get('/workouts').then((r) => setLogs(r.data));

  // Stable reference so the memoized <WorkoutHistory> isn't re-rendered by unrelated state.
  const openForm = useCallback(() => setShowForm(true), []);

  useEffect(() => {
    load();
    api.get('/exercises').then((r) => setExercises(r.data));
  }, []);

  /* ── Keep the draft in sync ──
     While the form is open everything is saved on each change; closing it
     (finish, save, discard or close) removes the draft. */
  useEffect(() => {
    if (!showForm) {
      clearWorkoutDraft(draftUserId);
      return;
    }
    saveWorkoutDraft(draftUserId, { form, isActive, startTime, completedSets, rest, sessionRest, plannedRest });
  }, [draftUserId, showForm, form, isActive, startTime, completedSets, rest, sessionRest, plannedRest]);

  // Tell the user once when a running workout was recovered.
  useEffect(() => {
    if (draft?.isActive) toast('Recuperamos tu entrenamiento en curso', { icon: '⏱️', id: 'draft-restored' });
  }, [draft]);

  // Pre-load exercises (and pre-configured rest times) from a routine via navigation state
  const handledNavStateRef = useRef(null);
  useEffect(() => {
    if (!location.state?.preloaded && !location.state?.restConfig) return;
    // Handle each navigation only once (StrictMode runs effects twice in development).
    if (handledNavStateRef.current === location.state) return;
    handledNavStateRef.current = location.state;
    window.history.replaceState({}, '');

    // Never silently replace a workout that is already running.
    if (draft?.isActive && !window.confirm(
      'Tienes un entrenamiento en curso. ¿Descartarlo y empezar esta rutina?'
    )) return;

    const routineRest = normalizeRest(location.state.restConfig);
    if (routineRest) setPlannedRest(routineRest);
    if (location.state.preloaded) {
      if (draft) {
        // Starting fresh from the routine: drop the recovered session.
        setIsActive(false);
        setStartTime(null);
        setSessionRest(null);
        setRest(null);
        setCompletedSets({});
      }
      setForm((prev) => ({
        ...(draft ? emptyForm() : prev),
        notes: location.state.routineName ? `Rutina: ${location.state.routineName}` : '',
        exercises: location.state.preloaded,
      }));
      setShowForm(true);
    }
  }, [location.state, draft]);

  /* ── Start workout session ──
     The pre-configured plan becomes the session's initial rest state. */
  const beginSession = useCallback(() => {
    setIsActive(true);
    setStartTime(Date.now());
    setSessionRest(plannedRest);
  }, [plannedRest]);

  const startWorkout = useCallback(() => {
    beginSession();
    setCompletedSets({});
    setRest(null);
  }, [beginSession]);

  const endSession = () => {
    setIsActive(false);
    setStartTime(null);
    setSessionRest(null); // drop live tweaks; the next session starts from the plan again
    setRest(null);
    lastExIdxRef.current = null;
  };

  /* ── Complete / Toggle a set ── */
  const completeSet = (exIdx, setIdx) => {
    const key = `${exIdx}-${setIdx}`;

    // Checking a set before pressing INICIAR starts the session clock automatically.
    if (!isActive) beginSession();

    // Work from the ref, not the `completedSets` of this render: two quick taps
    // run before React re-renders, and the second one must see the first.
    const current = completedSetsRef.current;

    // Toggle off if already done
    if (current[key]) {
      const next = { ...current };
      delete next[key];
      completedSetsRef.current = next;
      setCompletedSets(next);
      return;
    }

    // Mark as completed
    const next = { ...current, [key]: true };
    completedSetsRef.current = next;
    setCompletedSets(next);

    // Was this the last pending set of this exercise?
    const exerciseSets = form.exercises[exIdx]?.sets || [];
    const allDone = exerciseSets.every((_, si) => next[`${exIdx}-${si}`]);

    lastExIdxRef.current = exIdx;
    startRestTimer(allDone ? 'exercise' : 'set', exIdx);

    toast.success(`Serie ${setIdx + 1} completada ✓`);
  };

  // Read through refs so startRestTimer stays stable for the memoized <SessionBar>
  // even though the form changes on every keystroke.
  const formExercisesRef = useRef(form.exercises);
  formExercisesRef.current = form.exercises;
  const lastExIdxRef = useRef(null); // exercise of the last checked set (for the manual "Serie" button)

  /* Rest length:
     - between sets: the exercise's own rest from the routine (restSeconds) if it has one,
       otherwise the session's "entre series" value;
     - between exercises: always the session's "entre ejercicios" value. */
  const startRestTimer = useCallback((type, exIdx = lastExIdxRef.current) => {
    // Always called from a tap: unlock audio now so the end beep can play on mobile.
    primeRestAudio();
    const exerciseRest = Number(formExercisesRef.current[exIdx]?.restSeconds);
    const seconds = type === 'exercise'
      ? restConfig.betweenExercises
      : exerciseRest > 0 ? exerciseRest : restConfig.betweenSets;
    setRest({ type, endsAt: Date.now() + seconds * 1000, total: seconds });
  }, [restConfig.betweenSets, restConfig.betweenExercises]);

  // Stable callbacks for <RestTimer> so its interval isn't restarted on every render.
  const clearRest = useCallback(() => setRest(null), []);
  // Natural end (not skipped): <RestTimer> already played sound, vibration and
  // the notification; here we just trigger the edge glow.
  const handleRestDone = useCallback((type) => {
    setRest(null);
    setRestDone({ type, at: Date.now() });
  }, []);
  // Adjust the running rest (sec can be negative). Removing more time than is left
  // ends the rest in about a second, with the normal end-of-rest alert.
  const addRestTime = useCallback((sec) => {
    setRest((r) => {
      if (!r) return r;
      const endsAt = Math.max(Date.now() + 1000, r.endsAt + sec * 1000);
      const applied = (endsAt - r.endsAt) / 1000;
      return { ...r, endsAt, total: Math.max(1, r.total + applied) };
    });
  }, []);

  /* ── Saving ──
     savingRef blocks a second submit synchronously (a double tap fires before
     React re-renders); `saving` only drives the disabled/loading UI. The form's
     clientId makes the server return the same workout if a request repeats anyway. */
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const saveWorkout = async (payload) => {
    if (savingRef.current) return null;
    savingRef.current = true;
    setSaving(true);
    try {
      // The picker holds a local day; send the instant it represents (see localDayToInstant).
      return await api.post('/workouts', { ...payload, date: localDayToInstant(payload.date) });
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  /* ── Finish workout ── */
  const finishWorkout = async () => {
    const elapsedSec = secondsSince(startTime);
    const durationMinutes = Math.round(elapsedSec / 60);
    try {
      const res = await saveWorkout({ ...form, durationMinutes });
      if (!res) return; // a save is already in progress
      const msg = MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
      setWorkoutSummary({
        duration: fmtTime(elapsedSec),
        exerciseCount: form.exercises.length,
        totalSets: form.exercises.reduce((sum, ex) => sum + (ex.sets?.length || 0), 0),
        caloriesBurned: res.data.caloriesBurned || 0,
      });
      setMotivationalMsg(msg);
      setShowForm(false);
      endSession();
      setCompletedSets({});
      setForm(emptyForm());
      load();
    } catch (err) {
      toast.error(saveErrorMessage(err));
    }
  };

  // finishWorkout changes whenever the form does; the memoized <SessionBar> gets a
  // stable wrapper that always calls the latest version through a ref.
  const finishWorkoutRef = useRef(finishWorkout);
  finishWorkoutRef.current = finishWorkout;
  const handleFinish = useCallback(() => finishWorkoutRef.current(), []);

  const addExercise = () => {
    setForm({
      ...form,
      exercises: [
        ...form.exercises,
        { exercise: exercises[0]?._id || '', sets: [{ setNumber: 1, reps: 10, weight: 0 }] },
      ],
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isActive) {
      finishWorkout();
    } else {
      try {
        const res = await saveWorkout(form);
        if (!res) return; // a save is already in progress
        toast.success('¡Entrenamiento registrado!');
        setShowForm(false);
        setForm(emptyForm());
        load();
      } catch (err) {
        toast.error(saveErrorMessage(err));
      }
    }
  };

  /* ── Historical Reference Helper ──
     Index built once per `logs` change: exerciseId → that exercise's set lists,
     newest session first. Each set row then looks up only its own exercise
     instead of scanning every past session on every render. */
  const setsByExercise = useMemo(() => {
    const index = new Map();
    for (const log of logs) {
      for (const e of log.exercises || []) {
        const id = typeof e.exercise === 'object' ? e.exercise?._id : e.exercise;
        if (!id || !e.sets) continue;
        if (!index.has(id)) index.set(id, []);
        index.get(id).push(e.sets);
      }
    }
    return index;
  }, [logs]);

  const getPreviousSetReference = useCallback((exerciseId, setIdx) => {
    for (const sets of setsByExercise.get(exerciseId) || []) {
      const s = sets[setIdx];
      if (s && (s.weight > 0 || s.reps > 0)) return `${s.weight}kg × ${s.reps}`;
    }
    return '—';
  }, [setsByExercise]);

  /* ── Telemetry calculations ── */
  const totalSetsCount = useMemo(() => {
    return form.exercises.reduce((sum, ex) => sum + (ex.sets?.length || 0), 0);
  }, [form.exercises]);

  const completedSetsCount = useMemo(() => {
    return Object.values(completedSets).filter(Boolean).length;
  }, [completedSets]);

  const totalVolumeKg = useMemo(() => {
    return form.exercises.reduce((acc, ex, ei) => {
      return acc + (ex.sets || []).reduce((sAcc, s, si) => {
        const isDone = completedSets[`${ei}-${si}`];
        if (isActive && !isDone) return sAcc;
        const w = Number(s.weight) || 0;
        const r = Number(s.reps) || 0;
        return sAcc + (w * r);
      }, 0);
    }, 0);
  }, [form.exercises, completedSets, isActive]);


  return (
    <div className="min-h-screen bg-[#08090D] text-zinc-100 pb-28 selection:bg-lime-400 selection:text-black">
      {restDone && <RestDoneFlash key={restDone.at} type={restDone.type} />}
      {/* ══════════════════════════════════════════════════════════════════════
          HERO BANNER CON IMAGEN DE FONDO ORIGINAL (Siempre visible en la parte superior)
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden border-b border-white/10">
        {/* Foto de fondo oficial del gimnasio */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1400&q=80)' }}
        />
        {/* Degradado oscuro para asegurar máximo contraste y elegancia */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/75 to-[#08090D]" />
        <div className="absolute top-0 right-1/4 w-[500px] h-[300px] bg-lime-400/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[200px] bg-cyan-400/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-4 pt-10 pb-12">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <span className="px-2.5 py-1 rounded-md bg-lime-400/10 border border-lime-400/20 text-lime-400 text-xs font-bold uppercase tracking-wider">
                  Sala de Entrenamiento
                </span>
                {isActive && (
                  <span className="px-2.5 py-1 rounded-md bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
                    En vivo
                  </span>
                )}
              </div>

              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                {showForm ? (
                  location.state?.routineName ? (
                    location.state.routineName
                  ) : form.notes.startsWith('Rutina:') ? (
                    form.notes.replace('Rutina: ', '')
                  ) : (
                    'Registrar Entrenamiento'
                  )
                ) : (
                  <>
                    Mis <span className="text-lime-400">Entrenamientos</span>
                  </>
                )}
              </h1>

              <p className="text-zinc-300 text-sm md:text-base mt-1 max-w-lg">
                {showForm
                  ? 'Registra cada repetición y peso levantado. Supera tus marcas serie a serie.'
                  : 'Registra cada sesión, mide tu volumen total y supera tus límites día a día.'}
              </p>

              {/* Estadísticas de cabecera en modo vista previa */}
              {logs.length > 0 && !showForm && <HistoryStats logs={logs} />}

            </div>

            {/* Acciones principales en el banner */}
            <div className="flex items-center gap-3 shrink-0">
              {showForm ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (isActive && !window.confirm('¿Deseas descartar este entrenamiento en curso?')) return;
                      setShowForm(false);
                      endSession();
                    }}
                    className="px-4 sm:px-5 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/15 text-xs sm:text-sm font-bold transition-all shadow-md"
                  >
                    {isActive ? 'Descartar' : 'Cerrar'}
                  </button>

                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="px-7 py-3.5 rounded-2xl bg-lime-400 hover:bg-lime-300 text-zinc-950 font-black text-sm tracking-wide shadow-xl shadow-lime-400/25 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
                >
                  <LuPlus className="w-5 h-5 stroke-[2.5]" />
                  <span>REGISTRAR ENTRENAMIENTO</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          CONTENIDO PRINCIPAL
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="max-w-5xl mx-auto px-4 mt-6 space-y-4">
        {showForm ? (
          <div className="space-y-4">
            {/* ── Barra fija bajo la navbar: cronómetro de sesión + descanso compacto ──
                Una sola fila que se mantiene visible al hacer scroll sin tapar los ejercicios. */}
            <div className="sticky top-[74px] z-40">
              <SessionBar
                isActive={isActive}
                startTime={startTime}
                completedSets={completedSetsCount}
                totalSets={totalSetsCount}
                volumeKg={totalVolumeKg}
                canStart={form.exercises.length > 0}
                rest={isActive ? rest : null}
                saving={saving}
                onStart={startWorkout}
                onFinish={handleFinish}
                onStartRest={startRestTimer}
                onAddRestTime={addRestTime}
                onSkipRest={clearRest}
                onRestDone={handleRestDone}
              />
            </div>

            {/* ── Barra táctica de sesión (Fecha, Ánimo y Descansos) ── */}
            <div className="bg-zinc-900 border border-white/10 rounded-2xl p-4 space-y-3 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Selector de fecha */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Fecha:</span>
                  <input
                    type="date"
                    className="bg-zinc-800 border border-white/15 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-lime-400"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>

                {/* Selector de estado de ánimo */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider mr-1">Ánimo:</span>
                  {FEELINGS.map((f) => {
                    const isSelected = form.feeling === f.v;
                    const Icon = f.Icon;
                    return (
                      <button
                        key={f.v}
                        type="button"
                        onClick={() => setForm({ ...form, feeling: f.v })}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                          isSelected
                            ? 'bg-lime-400 text-zinc-950 shadow-md shadow-lime-400/20'
                            : 'bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 hover:bg-zinc-700'
                        }`}
                        title={f.l}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{f.l}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Botón selector de descanso */}
                <button
                  type="button"
                  onClick={() => setShowRestConfig(!showRestConfig)}
                  aria-expanded={showRestConfig}
                  className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-xs font-bold text-zinc-200 hover:text-white flex items-center gap-1.5 transition-colors"
                >
                  <LuTimer className="w-4 h-4 text-lime-400" />
                  <span>Descansos</span>
                  <span className="font-mono text-zinc-400">
                    {fmtPreset(restConfig.betweenSets)} / {fmtPreset(restConfig.betweenExercises)}
                  </span>
                  <LuChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showRestConfig ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Configuración de descansos: antes de iniciar edita el plan (y el predeterminado);
                  con la sesión en marcha solo ajusta esta sesión. */}
              {showRestConfig && (
                <div className="pt-3 border-t border-white/10 space-y-3 animate-fadeIn">
                  <p className="text-[11px] text-zinc-400">
                    {isActive
                      ? 'Ajuste solo para esta sesión: tus tiempos predeterminados no cambian.'
                      : 'Se aplicarán al iniciar y quedan guardados como predeterminados. El descanso empieza solo al marcar una serie ✓.'}
                  </p>
                  {form.exercises.some((e) => e.restSeconds > 0) && (
                    <p className="text-[11px] text-lime-400/90 flex items-center gap-1.5">
                      <LuHourglass className="w-3.5 h-3.5 shrink-0" />
                      Los ejercicios con descanso propio de la rutina (⏳ en su tarjeta) usan ese tiempo entre series.
                    </p>
                  )}
                  <RestConfigPanel value={restConfig} onChange={updateRestConfig} />
                  {isActive && (restConfig.betweenSets !== restDefaults.betweenSets || restConfig.betweenExercises !== restDefaults.betweenExercises) && (
                    <button
                      type="button"
                      onClick={() => {
                        setRestDefaults(restConfig);
                        setPlannedRest(restConfig); // the next session starts from these too
                      }}
                      className="text-[11px] font-bold text-lime-400 hover:text-lime-300 underline underline-offset-2"
                    >
                      Guardar estos tiempos como predeterminados
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* ── Formulario de ejercicios ── */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {form.exercises.map((ex, i) => {
                const exFound = exercises.find((e) => e._id === ex.exercise);

                return (
                  <div
                    key={i}
                    className="bg-zinc-900 border border-white/10 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4"
                  >
                    {/* Fila superior de cabecera de ejercicio */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="w-8 h-8 rounded-xl bg-lime-400 text-zinc-950 text-sm font-black flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>

                        <div className="flex-1 min-w-0">
                          <select
                            className="w-full bg-zinc-800 border border-white/15 rounded-xl px-3 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-lime-400 truncate"
                            value={ex.exercise}
                            onChange={(e) => {
                              const copy = [...form.exercises];
                              copy[i].exercise = e.target.value;
                              setForm({ ...form, exercises: copy });
                            }}
                          >
                            {exercises.map((opt) => (
                              <option key={opt._id} value={opt._id} className="bg-zinc-900 text-white">
                                {opt.name} ({opt.muscleGroup})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Botones de acción del ejercicio */}
                      <div className="flex items-center gap-2 shrink-0">
                        {ex.restSeconds > 0 && (
                          <span
                            className="h-10 px-2.5 rounded-xl bg-lime-400/10 border border-lime-400/20 text-lime-400 text-xs font-mono font-bold flex items-center gap-1"
                            title="Descanso entre series de este ejercicio (definido en la rutina)"
                          >
                            <LuHourglass className="w-3.5 h-3.5" />
                            {fmtPreset(ex.restSeconds)}
                          </span>
                        )}
                        {exFound && (
                          <button
                            type="button"
                            onClick={() => setPreviewExercise(exFound)}
                            className="w-10 h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border border-white/10 flex items-center justify-center transition-colors"
                            title="Ver técnica"
                          >
                            <LuEye className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            const copy = [...form.exercises];
                            copy.splice(i, 1);
                            setForm({ ...form, exercises: copy });
                          }}
                          className="w-10 h-10 rounded-xl bg-zinc-800/80 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 border border-white/10 flex items-center justify-center transition-colors"
                          title="Eliminar ejercicio"
                        >
                          <LuTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* ── Tabla de series sólida y alineada (CSS Grid) ── */}
                    <div className="space-y-2">
                      {/* Cabecera de columnas */}
                      <div className="grid grid-cols-[44px_1fr_90px_80px_48px] sm:grid-cols-[52px_1.2fr_110px_90px_52px] items-center gap-2 sm:gap-3 px-2 pb-1 text-center">
                        <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400 text-left">
                          Serie
                        </span>
                        <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
                          Anterior
                        </span>
                        <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
                          Peso (kg)
                        </span>
                        <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
                          Reps
                        </span>
                        <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400 text-center">
                          ✓
                        </span>
                      </div>

                      {/* Filas de series */}
                      {ex.sets.map((s, si) => {
                        const isDone = completedSets[`${i}-${si}`];
                        const prevRef = getPreviousSetReference(ex.exercise, si);

                        return (
                          <div
                            key={si}
                            className={`grid grid-cols-[44px_1fr_90px_80px_48px] sm:grid-cols-[52px_1.2fr_110px_90px_52px] items-center gap-2 sm:gap-3 px-2 py-2 rounded-xl transition-all duration-150 ${
                              isDone
                                ? 'bg-lime-400/10 border border-lime-400/30'
                                : 'bg-zinc-950/60 hover:bg-zinc-800/40 border border-white/5'
                            }`}
                          >
                            {/* Número de serie */}
                            <div className="flex items-center justify-start">
                              <span
                                className={`w-8 h-8 rounded-xl text-xs font-black flex items-center justify-center transition-colors ${
                                  isDone
                                    ? 'bg-lime-400 text-zinc-950'
                                    : 'bg-zinc-800 text-zinc-200 border border-white/10'
                                }`}
                              >
                                {s.setNumber}
                              </span>
                            </div>

                            {/* Referencia histórica */}
                            <div className="text-center truncate">
                              <span className="text-xs sm:text-sm font-mono font-semibold text-zinc-400">
                                {prevRef}
                              </span>
                            </div>

                            {/* Input de peso */}
                            <div className="flex justify-center">
                              <input
                                type="text"
                                inputMode="decimal"
                                placeholder="0"
                                className={`w-full max-w-[100px] h-10 bg-zinc-900 border rounded-xl text-center text-sm sm:text-base font-black text-white tabular-nums outline-none transition focus:ring-2 focus:ring-lime-400/40 ${
                                  isDone
                                    ? 'border-lime-500/50 text-lime-300'
                                    : 'border-white/15 focus:border-lime-400'
                                }`}
                                value={s.weight}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  if (v !== '' && !/^\d*\.?\d*$/.test(v)) return;
                                  const copy = [...form.exercises];
                                  copy[i].sets[si].weight = v === '' ? '' : (/\.$/.test(v) ? v : Number(v));
                                  setForm({ ...form, exercises: copy });
                                }}
                                onBlur={(e) => {
                                  if (e.target.value === '' || e.target.value === '.') {
                                    const copy = [...form.exercises];
                                    copy[i].sets[si].weight = 0;
                                    setForm({ ...form, exercises: copy });
                                  }
                                }}
                              />
                            </div>

                            {/* Input de repeticiones */}
                            <div className="flex justify-center">
                              <input
                                type="text"
                                inputMode="numeric"
                                placeholder="0"
                                className={`w-full max-w-[80px] h-10 bg-zinc-900 border rounded-xl text-center text-sm sm:text-base font-black text-white tabular-nums outline-none transition focus:ring-2 focus:ring-lime-400/40 ${
                                  isDone
                                    ? 'border-lime-500/50 text-lime-300'
                                    : 'border-white/15 focus:border-lime-400'
                                }`}
                                value={s.reps}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  if (v !== '' && !/^\d+$/.test(v)) return;
                                  const copy = [...form.exercises];
                                  copy[i].sets[si].reps = v === '' ? '' : Number(v);
                                  setForm({ ...form, exercises: copy });
                                }}
                                onBlur={(e) => {
                                  if (e.target.value === '') {
                                    const copy = [...form.exercises];
                                    copy[i].sets[si].reps = 0;
                                    setForm({ ...form, exercises: copy });
                                  }
                                }}
                              />
                            </div>

                            {/* Botón táctil de Check ✓ */}
                            <div className="flex justify-center">
                              <button
                                type="button"
                                onClick={() => completeSet(i, si)}
                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-90 ${
                                  isDone
                                    ? 'bg-lime-400 text-zinc-950 font-black shadow-lg shadow-lime-400/30'
                                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white border border-white/10'
                                }`}
                                title={isDone ? 'Serie completada (clic para desmarcar)' : 'Marcar como completada'}
                              >
                                <LuCheck className={`w-5 h-5 stroke-[3] ${isDone ? 'text-zinc-950' : 'text-zinc-400'}`} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Acciones para agregar/quitar series */}
                    <div className="flex items-center justify-between gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          const copy = [...form.exercises];
                          const lastSet = copy[i].sets[copy[i].sets.length - 1];
                          copy[i].sets.push({
                            setNumber: copy[i].sets.length + 1,
                            reps: lastSet ? lastSet.reps : 10,
                            weight: lastSet ? lastSet.weight : 0,
                          });
                          setForm({ ...form, exercises: copy });
                        }}
                        className="py-2.5 px-4 rounded-xl border border-dashed border-white/20 hover:border-lime-400/50 bg-zinc-850 hover:bg-zinc-800 text-xs font-bold text-zinc-200 hover:text-lime-400 transition-colors flex items-center gap-1.5"
                      >
                        <LuPlus className="w-3.5 h-3.5" /> Agregar Serie
                      </button>

                      {ex.sets.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const copy = [...form.exercises];
                            copy[i].sets.pop();
                            setForm({ ...form, exercises: copy });
                          }}
                          className="py-2 px-3 rounded-xl text-zinc-400 hover:text-red-400 text-xs font-semibold transition-colors flex items-center gap-1"
                        >
                          <LuMinus className="w-3.5 h-3.5" /> Quitar serie
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Botón para agregar ejercicio */}
              <button
                type="button"
                onClick={addExercise}
                className="w-full py-4 rounded-2xl border border-dashed border-white/20 hover:border-lime-400/60 bg-zinc-900 hover:bg-zinc-850 text-sm font-bold text-white hover:text-lime-400 transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <LuPlus className="w-4 h-4" /> Agregar Ejercicio a la Sesión
              </button>

              {/* Notas de la sesión */}
              <div className="bg-zinc-900 border border-white/10 rounded-2xl p-4 space-y-2 shadow-xl">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 block">
                  Notas / Sensaciones del entrenamiento
                </label>
                <textarea
                  placeholder="Ej: Buena congestión en piernas, aumentar carga en sentadilla la próxima semana..."
                  rows={2}
                  className="w-full bg-zinc-950 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-lime-400 resize-none transition"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>

              {/* Botón final inferior */}
              {isActive ? (
                <button
                  type="button"
                  onClick={finishWorkout}
                  disabled={saving}
                  className="w-full py-4 rounded-2xl bg-lime-400 hover:bg-lime-300 disabled:opacity-60 disabled:cursor-wait text-zinc-950 font-black text-sm tracking-wide shadow-xl shadow-lime-400/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                >
                  {saving ? (
                    'GUARDANDO…'
                  ) : (
                    <>
                      <LuSquare className="w-4 h-4 fill-zinc-950" /> TERMINAR ENTRENAMIENTO (<ElapsedTime startTime={startTime} isActive={isActive} />)
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-4 rounded-2xl bg-lime-400 hover:bg-lime-300 disabled:opacity-60 disabled:cursor-wait text-zinc-950 font-black text-sm tracking-wide shadow-xl shadow-lime-400/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                >
                  {saving ? 'GUARDANDO…' : <><LuCheck className="w-4 h-4 stroke-[3]" /> GUARDAR ENTRENAMIENTO</>}
                </button>
              )}
            </form>
          </div>
        ) : (
          /* ── Vista de historial (componente aislado del estado de la sesión en vivo) ── */
          <WorkoutHistory logs={logs} onStart={openForm} />
        )}
      </div>

      {/* ── Modal de vista previa del ejercicio ── */}
      {previewExercise && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn"
          onClick={() => setPreviewExercise(null)}
        >
          <div
            className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-zinc-900/95 backdrop-blur-md border-b border-white/10 p-4 flex items-center justify-between z-10">
              <h3 className="text-base font-bold text-white truncate">{previewExercise.name}</h3>
              <button
                type="button"
                onClick={() => setPreviewExercise(null)}
                className="text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 w-8 h-8 rounded-lg flex items-center justify-center transition shrink-0"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-4">
              {previewExercise.youtubeVideoId && (
                <div className="aspect-video rounded-xl overflow-hidden bg-black">
                  <iframe
                    className="w-full h-full"
                    src={`https://www.youtube.com/embed/${previewExercise.youtubeVideoId}`}
                    title={previewExercise.name}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <span className="bg-lime-400/10 text-lime-400 border border-lime-400/20 text-xs px-2.5 py-1 rounded-full capitalize font-semibold">
                  {previewExercise.muscleGroup}
                </span>
                <span className="bg-zinc-800 text-zinc-300 text-xs px-2.5 py-1 rounded-full capitalize">
                  {previewExercise.difficulty === 'beginner' ? 'Principiante' : previewExercise.difficulty === 'intermediate' ? 'Intermedio' : 'Avanzado'}
                </span>
                <span className="bg-zinc-800 text-zinc-300 text-xs px-2.5 py-1 rounded-full capitalize">
                  {previewExercise.equipment}
                </span>
              </div>

              {previewExercise.description && (
                <p className="text-sm text-zinc-300 leading-relaxed">{previewExercise.description}</p>
              )}

              {previewExercise.instructions?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <LuClipboardList className="w-4 h-4 text-lime-400" /> Instrucciones
                  </h4>
                  <ol className="list-decimal list-inside space-y-1.5">
                    {previewExercise.instructions.map((step, i) => (
                      <li key={i} className="text-sm text-zinc-300">{step}</li>
                    ))}
                  </ol>
                </div>
              )}

              {previewExercise.tips?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <LuLightbulb className="w-4 h-4 text-amber-400" /> Consejos de técnica
                  </h4>
                  <ul className="space-y-1.5">
                    {previewExercise.tips.map((tip, i) => (
                      <li key={i} className="text-sm text-zinc-300 flex gap-2">
                        <span className="text-amber-400 shrink-0">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de resumen motivacional ── */}
      {motivationalMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-zinc-900 border border-lime-400/30 rounded-3xl w-full max-w-md shadow-2xl p-7 space-y-5 text-center">
            <div className="w-16 h-16 rounded-2xl bg-lime-400/10 border border-lime-400/20 text-lime-400 flex items-center justify-center mx-auto">
              <motivationalMsg.Icon className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-lime-400">Sesión Finalizada</span>
              <h2 className="text-2xl font-black text-white mt-1">
                ¡Entrenamiento Completado!
              </h2>
            </div>

            <p className="text-sm text-zinc-300 italic leading-relaxed bg-zinc-950 p-4 rounded-xl border border-white/10">
              "{motivationalMsg.text}"
            </p>

            {workoutSummary && (
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div className="bg-zinc-950 border border-white/5 rounded-xl p-3">
                  <p className="text-xl font-black text-white font-mono">{workoutSummary.duration}</p>
                  <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Duración</p>
                </div>
                <div className="bg-zinc-950 border border-white/5 rounded-xl p-3">
                  <p className="text-xl font-black text-cyan-400 font-mono">{workoutSummary.exerciseCount}</p>
                  <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Ejercicios</p>
                </div>
                <div className="bg-zinc-950 border border-white/5 rounded-xl p-3">
                  <p className="text-xl font-black text-lime-400 font-mono">{workoutSummary.totalSets}</p>
                  <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Series Totales</p>
                </div>
                <div className="bg-zinc-950 border border-white/5 rounded-xl p-3">
                  <p className="text-xl font-black text-orange-400 font-mono flex items-center justify-center gap-1">
                    <LuFlame className="w-5 h-5" /> {workoutSummary.caloriesBurned}
                  </p>
                  <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">kcal est.</p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => { setMotivationalMsg(null); setWorkoutSummary(null); }}
              className="w-full py-3.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-zinc-950 font-black text-sm transition-all shadow-lg shadow-lime-400/20 active:scale-95"
            >
              ¡A descansar!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
