import { useEffect, useState, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  LuDumbbell, LuFlame, LuCalendar, LuTrophy, LuBrain, LuZap, LuDroplets,
  LuMedal, LuTrendingUp, LuSunrise, LuGem, LuBot, LuBrickWall,
  LuRefreshCw, LuHourglass, LuTimer, LuPlay, LuSquare,
  LuEye, LuClipboardList, LuLightbulb, LuClock, LuPlus,
  LuTarget, LuCheck, LuTrash2, LuMinus,
  LuChevronDown
} from 'react-icons/lu';
import WorkoutHistory from '../components/workouts/WorkoutHistory';
import HistoryStats from '../components/workouts/HistoryStats';
import ElapsedTime from '../components/workouts/ElapsedTime';
import RestOverlay from '../components/workouts/RestOverlay';
import { fmtTime, secondsSince, FEELINGS } from '../components/workouts/workoutUtils';

/* ───── helpers ───── */
function fmtPreset(sec) {
  if (sec >= 60 && sec % 60 === 0) {
    return `${sec / 60}m`;
  }
  if (sec >= 60) {
    return `${Math.floor(sec / 60)}m ${sec % 60}s`;
  }
  return `${sec}s`;
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

const REST_SET_PRESETS = [45, 60, 90, 120, 180];
const REST_EX_PRESETS = [60, 120, 180, 240, 300];

export default function Workouts() {
  const location = useLocation();
  const [logs, setLogs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [exercises, setExercises] = useState([]);
  const [showRestConfig, setShowRestConfig] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    notes: '',
    feeling: 'good',
    exercises: [],
  });

  /* ── Timer state ──
     Only the start timestamp lives here; <ElapsedTime> derives and renders the
     running seconds itself, so the chronometer tick doesn't re-render this page. */
  const [isActive, setIsActive] = useState(false);        // workout in progress
  const [startTime, setStartTime] = useState(null);

  /* ── Rest timer state ── */
  const [restBetweenSets, setRestBetweenSets] = useState(90);      // seconds
  const [restBetweenExercises, setRestBetweenExercises] = useState(180); // seconds
  // Active rest: { type: 'set' | 'exercise', endsAt: ms timestamp, total: seconds } or null.
  // Only the end time is stored; <RestOverlay> renders the countdown itself.
  const [rest, setRest] = useState(null);

  /* ── Completed sets tracking: completedSets[exerciseIdx-setIdx] = true ── */
  const [completedSets, setCompletedSets] = useState({});

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

  // Pre-load exercises from a routine via navigation state
  useEffect(() => {
    if (location.state?.preloaded) {
      setForm((prev) => ({
        ...prev,
        notes: location.state.routineName ? `Rutina: ${location.state.routineName}` : '',
        exercises: location.state.preloaded,
      }));
      setShowForm(true);
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  /* ── Start workout session ── */
  const startWorkout = () => {
    setIsActive(true);
    setStartTime(Date.now());
    setCompletedSets({});
    setRest(null);
  };

  /* ── Complete / Toggle a set ── */
  const completeSet = (exIdx, setIdx) => {
    const key = `${exIdx}-${setIdx}`;
    
    // Toggle off if already done
    if (completedSets[key]) {
      setCompletedSets((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return;
    }

    // Mark as completed
    setCompletedSets((prev) => ({ ...prev, [key]: true }));

    // Determine if this was the last set of this exercise
    const exerciseSets = form.exercises[exIdx]?.sets || [];
    const allDone = exerciseSets.every((_, si) =>
      si === setIdx || completedSets[`${exIdx}-${si}`]
    );

    if (allDone) {
      startRestTimer('exercise');
    } else {
      startRestTimer('set');
    }

    toast.success(`Serie ${setIdx + 1} completada ✓`);
  };

  const startRestTimer = (type) => {
    const seconds = type === 'exercise' ? restBetweenExercises : restBetweenSets;
    setRest({ type, endsAt: Date.now() + seconds * 1000, total: seconds });
  };

  // Stable callbacks for <RestOverlay> so its interval isn't restarted on every render.
  const clearRest = useCallback(() => setRest(null), []);
  const addRestTime = useCallback((sec) => {
    setRest((r) => r && { ...r, endsAt: r.endsAt + sec * 1000, total: r.total + sec });
  }, []);

  /* ── Finish workout ── */
  const finishWorkout = async () => {
    const elapsedSec = secondsSince(startTime);
    const durationMinutes = Math.round(elapsedSec / 60);
    try {
      const res = await api.post('/workouts', { ...form, durationMinutes });
      const msg = MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
      setWorkoutSummary({
        duration: fmtTime(elapsedSec),
        exerciseCount: form.exercises.length,
        totalSets: form.exercises.reduce((sum, ex) => sum + (ex.sets?.length || 0), 0),
        caloriesBurned: res.data.caloriesBurned || 0,
      });
      setMotivationalMsg(msg);
      setShowForm(false);
      setIsActive(false);
      setStartTime(null);
      setRest(null);
      setCompletedSets({});
      setForm({ date: new Date().toISOString().slice(0, 10), notes: '', feeling: 'good', exercises: [] });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar');
    }
  };

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
        await api.post('/workouts', form);
        toast.success('¡Entrenamiento registrado!');
        setShowForm(false);
        setForm({ date: new Date().toISOString().slice(0, 10), notes: '', feeling: 'good', exercises: [] });
        load();
      } catch (err) {
        toast.error(err.response?.data?.message || 'Error');
      }
    }
  };

  /* ── Historical Reference Helper ── */
  const getPreviousSetReference = useCallback((exerciseId, setIdx) => {
    if (!logs || logs.length === 0 || !exerciseId) return '—';
    for (const log of logs) {
      if (!log.exercises) continue;
      const foundEx = log.exercises.find((e) => {
        const id = typeof e.exercise === 'object' ? e.exercise?._id : e.exercise;
        return id === exerciseId;
      });
      if (foundEx && foundEx.sets && foundEx.sets[setIdx]) {
        const s = foundEx.sets[setIdx];
        if (s.weight > 0 || s.reps > 0) {
          return `${s.weight}kg × ${s.reps}`;
        }
      }
    }
    return '—';
  }, [logs]);

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

              {/* Telemetría activa en cabecera en modo entrenamiento */}
              {showForm && (
                <div className="flex items-center gap-2.5 mt-4 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/15 text-xs font-mono font-bold text-white shadow-lg">
                    <LuClock className="w-3.5 h-3.5 text-lime-400" />
                    <ElapsedTime startTime={startTime} isActive={isActive} />
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/15 text-xs font-mono font-bold text-cyan-400 shadow-lg">
                    <LuTarget className="w-3.5 h-3.5" />
                    {completedSetsCount}/{totalSetsCount} series
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/15 text-xs font-mono font-bold text-amber-400 shadow-lg">
                    <LuDumbbell className="w-3.5 h-3.5" />
                    {totalVolumeKg.toLocaleString()} kg
                  </span>
                </div>
              )}
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
                      setIsActive(false);
                      setStartTime(null);
                      setRest(null);
                    }}
                    className="px-4 sm:px-5 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/15 text-xs sm:text-sm font-bold transition-all shadow-md"
                  >
                    {isActive ? 'Descartar' : 'Cerrar'}
                  </button>

                  {isActive ? (
                    <button
                      type="button"
                      onClick={finishWorkout}
                      className="px-5 sm:px-6 py-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-zinc-950 font-black text-xs sm:text-sm tracking-wide shadow-xl shadow-lime-400/25 active:scale-95 transition-all flex items-center gap-2"
                    >
                      <LuSquare className="w-4 h-4 fill-zinc-950" /> TERMINAR
                    </button>
                  ) : (
                    form.exercises.length > 0 && (
                      <button
                        type="button"
                        onClick={startWorkout}
                        className="px-5 sm:px-6 py-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-zinc-950 font-black text-xs sm:text-sm tracking-wide shadow-xl shadow-lime-400/25 active:scale-95 transition-all flex items-center gap-2"
                      >
                        <LuPlay className="w-4 h-4 fill-zinc-950" /> INICIAR
                      </button>
                    )
                  )}
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
            {/* ── Overlay flotante de descanso cuando está activo ── */}
            {isActive && rest && (
              <RestOverlay rest={rest} onAddTime={addRestTime} onSkip={clearRest} onDone={clearRest} />
            )}

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
                  className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-xs font-bold text-zinc-200 hover:text-white flex items-center gap-1.5 transition-colors"
                >
                  <LuTimer className="w-4 h-4 text-lime-400" />
                  <span>Descansos</span>
                  <LuChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showRestConfig ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Pestaña expandible de configuración de descansos */}
              {showRestConfig && (
                <div className="pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fadeIn">
                  {/* Entre series */}
                  <div className="bg-zinc-950 border border-white/10 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                        <LuHourglass className="w-3.5 h-3.5 text-lime-400" /> Entre series:
                      </span>
                      <span className="text-xs font-mono font-bold text-lime-400">
                        {fmtPreset(restBetweenSets)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setRestBetweenSets((prev) => Math.max(15, prev - 15))}
                        className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold"
                      >
                        -15s
                      </button>
                      {REST_SET_PRESETS.map((sec) => (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => setRestBetweenSets(sec)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                            restBetweenSets === sec
                              ? 'bg-lime-400 text-zinc-950'
                              : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                          }`}
                        >
                          {fmtPreset(sec)}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setRestBetweenSets((prev) => Math.min(600, prev + 15))}
                        className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold"
                      >
                        +15s
                      </button>
                    </div>
                  </div>

                  {/* Entre ejercicios */}
                  <div className="bg-zinc-950 border border-white/10 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                        <LuRefreshCw className="w-3.5 h-3.5 text-cyan-400" /> Entre ejercicios:
                      </span>
                      <span className="text-xs font-mono font-bold text-cyan-400">
                        {fmtPreset(restBetweenExercises)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setRestBetweenExercises((prev) => Math.max(30, prev - 30))}
                        className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold"
                      >
                        -30s
                      </button>
                      {REST_EX_PRESETS.map((sec) => (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => setRestBetweenExercises(sec)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                            restBetweenExercises === sec
                              ? 'bg-cyan-400 text-zinc-950'
                              : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                          }`}
                        >
                          {fmtPreset(sec)}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setRestBetweenExercises((prev) => Math.min(900, prev + 30))}
                        className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold"
                      >
                        +30s
                      </button>
                    </div>
                  </div>
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
                  className="w-full py-4 rounded-2xl bg-lime-400 hover:bg-lime-300 text-zinc-950 font-black text-sm tracking-wide shadow-xl shadow-lime-400/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                >
                  <LuSquare className="w-4 h-4 fill-zinc-950" /> TERMINAR ENTRENAMIENTO (<ElapsedTime startTime={startTime} isActive={isActive} />)
                </button>
              ) : (
                <button
                  type="submit"
                  className="w-full py-4 rounded-2xl bg-lime-400 hover:bg-lime-300 text-zinc-950 font-black text-sm tracking-wide shadow-xl shadow-lime-400/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                >
                  <LuCheck className="w-4 h-4 stroke-[3]" /> GUARDAR ENTRENAMIENTO
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
