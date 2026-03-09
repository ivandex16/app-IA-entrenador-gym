import { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  LuSmile, LuMeh, LuFrown, LuLaugh, LuAngry,
  LuDumbbell, LuFlame, LuCalendar, LuTrophy, LuBrain, LuZap, LuDroplets,
  LuMedal, LuTrendingUp, LuSunrise, LuGem, LuBot, LuBrickWall,
  LuRefreshCw, LuHourglass, LuSkipForward, LuTimer, LuPlay, LuSquare,
  LuEye, LuClipboardList, LuLightbulb, LuClock, LuPlus, LuArrowRight,
  LuActivity, LuTarget, LuChevronRight,
} from 'react-icons/lu';

/* ───── helpers ───── */
function fmtTime(totalSec) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

const FEELINGS = [
  { v: 'great', l: 'Genial', Icon: LuLaugh },
  { v: 'good', l: 'Bien', Icon: LuSmile },
  { v: 'ok', l: 'Normal', Icon: LuMeh },
  { v: 'tired', l: 'Cansado', Icon: LuFrown },
  { v: 'bad', l: 'Mal', Icon: LuAngry },
];

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
  const [logs, setLogs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [exercises, setExercises] = useState([]);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    notes: '',
    feeling: 'good',
    exercises: [],
  });

  /* ── Timer state ── */
  const [isActive, setIsActive] = useState(false);        // workout in progress
  const [elapsedSec, setElapsedSec] = useState(0);         // total chronometer
  const [startTime, setStartTime] = useState(null);
  const chronoRef = useRef(null);

  /* ── Rest timer state ── */
  const [restBetweenSets, setRestBetweenSets] = useState(90);      // seconds
  const [restBetweenExercises, setRestBetweenExercises] = useState(180); // seconds
  const [restRemaining, setRestRemaining] = useState(0);
  const [restType, setRestType] = useState(null); // 'set' | 'exercise' | null
  const [restKey, setRestKey] = useState(0); // forces timer reset
  const restRef = useRef(null);
  const alertAudioRef = useRef(null);

  /* ── Completed sets tracking: completedSets[exerciseIdx][setIdx] = true ── */
  const [completedSets, setCompletedSets] = useState({});

  /* ── Exercise preview modal ── */
  const [previewExercise, setPreviewExercise] = useState(null);

  /* ── Motivational modal ── */
  const [motivationalMsg, setMotivationalMsg] = useState(null);
  const [workoutSummary, setWorkoutSummary] = useState(null);

  const load = () => api.get('/workouts').then((r) => setLogs(r.data));

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

  /* ── Chronometer effect ── */
  useEffect(() => {
    if (isActive) {
      chronoRef.current = setInterval(() => {
        setElapsedSec(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(chronoRef.current);
  }, [isActive, startTime]);

  /* ── Rest countdown effect ── */
  useEffect(() => {
    if (restRemaining > 0) {
      restRef.current = setTimeout(() => {
        setRestRemaining((prev) => prev - 1);
      }, 1000);
    } else if (restType !== null) {
      playRestAlert();
      toast('¡Descanso terminado! A trabajar', { icon: '✓', duration: 4000 });
      setRestType(null);
    }
    return () => clearTimeout(restRef.current);
  }, [restRemaining, restKey]);

  const playRestAlert = useCallback(() => {
    try {
      // Use Web Audio API for alert sound
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const playBeep = (freq, delay) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        gain.gain.value = 0.3;
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.15);
      };
      playBeep(880, 0);
      playBeep(880, 0.2);
      playBeep(1320, 0.4);
    } catch {
      // Fallback: no sound
    }
  }, []);

  /* ── Start workout session ── */
  const startWorkout = () => {
    setIsActive(true);
    setStartTime(Date.now());
    setElapsedSec(0);
    setCompletedSets({});
    setRestRemaining(0);
    setRestType(null);
  };

  /* ── Complete a set ── */
  const completeSet = (exIdx, setIdx) => {
    const key = `${exIdx}-${setIdx}`;
    if (completedSets[key]) return; // already done

    setCompletedSets((prev) => ({ ...prev, [key]: true }));

    // Determine if this was the last set of this exercise
    const exerciseSets = form.exercises[exIdx].sets;
    const allDone = exerciseSets.every((_, si) =>
      si === setIdx || completedSets[`${exIdx}-${si}`]
    );

    if (allDone) {
      // Last set of this exercise → rest between exercises
      startRestTimer('exercise');
    } else {
      // Not last set → rest between sets
      startRestTimer('set');
    }

    toast.success(`Serie ${setIdx + 1} completada ✓`);
  };

  const startRestTimer = (type) => {
    clearTimeout(restRef.current);
    const seconds = type === 'exercise' ? restBetweenExercises : restBetweenSets;
    setRestType(type);
    setRestRemaining(seconds);
    setRestKey((k) => k + 1);
  };

  const skipRest = () => {
    clearTimeout(restRef.current);
    setRestRemaining(0);
    setRestType(null);
  };
    setRestRemaining(0);
    setRestType(null);
  };

  /* ── Finish workout ── */
  const finishWorkout = async () => {
    const durationMinutes = Math.round(elapsedSec / 60);
    try {
      const res = await api.post('/workouts', { ...form, durationMinutes });
      // Pick a random motivational message
      const msg = MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
      setWorkoutSummary({
        duration: fmtTime(elapsedSec),
        exerciseCount: form.exercises.length,
        totalSets: form.exercises.reduce((sum, ex) => sum + ex.sets.length, 0),
        caloriesBurned: res.data.caloriesBurned || 0,
      });
      setMotivationalMsg(msg);
      setShowForm(false);
      setIsActive(false);
      clearInterval(chronoRef.current);
      clearInterval(restRef.current);
      setElapsedSec(0);
      setRestRemaining(0);
      setRestType(null);
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

  const restProgress = restType
    ? ((restType === 'exercise' ? restBetweenExercises : restBetweenSets) - restRemaining) /
    (restType === 'exercise' ? restBetweenExercises : restBetweenSets)
    : 0;

  const FEELING_COLORS = {
    great: 'from-emerald-500 to-green-400',
    good: 'from-blue-500 to-cyan-400',
    ok: 'from-amber-500 to-yellow-400',
    tired: 'from-orange-500 to-red-400',
    bad: 'from-red-500 to-rose-400',
  };

  return (
    <div className="min-h-screen pb-24">
      {/* ══════════ HERO BANNER ══════════ */}
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1400&q=80)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-dark/80 via-dark/70 to-dark" />
        <div className="absolute top-0 right-1/4 w-[500px] h-[300px] bg-primary/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[200px] bg-accent/10 rounded-full blur-[100px]" />

        <div className="relative max-w-5xl mx-auto px-4 pt-12 pb-16">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="animate-fadeInUp">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
                  <LuActivity className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                    Mis <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Entrenamientos</span>
                  </h1>
                </div>
              </div>
              <p className="text-gray-400 text-base md:text-lg max-w-lg">
                Registra cada sesión, mide tu progreso y supera tus límites día a día.
              </p>

              {/* Stats strip */}
              {logs.length > 0 && (
                <div className="flex gap-6 mt-5">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{logs.length}</p>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Sesiones</p>
                  </div>
                  <div className="w-px bg-slate-700" />
                  <div className="text-center">
                    <p className="text-2xl font-bold text-accent">
                      {logs.reduce((sum, l) => sum + (l.exercises?.length || 0), 0)}
                    </p>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Ejercicios</p>
                  </div>
                  <div className="w-px bg-slate-700" />
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-400">
                      {logs.reduce((sum, l) => sum + (l.caloriesBurned || 0), 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">kcal totales</p>
                  </div>
                </div>
              )}
            </div>

            {/* Action button */}
            <div data-tour="workouts-action" className="animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
              <button
                onClick={() => setShowForm(!showForm)}
                className="group bg-gradient-to-r from-primary to-indigo-600 hover:from-indigo-600 hover:to-primary px-7 py-3.5 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02]"
              >
                {showForm ? (
                  'Cancelar'
                ) : (
                  <>
                    <LuPlus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" /> Registrar Entrenamiento
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-6 space-y-4">

<<<<<<< HEAD
      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ─── Chronometer & Rest Timer Bar ─── */}
          {isActive && (
            <div className="sticky top-0 z-30 space-y-2">
              {/* Main chronometer */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs text-gray-400 uppercase tracking-wide">Entrenamiento en curso</span>
                </div>
                <span className="text-2xl font-mono font-bold text-white tabular-nums">
                  {fmtTime(elapsedSec)}
                </span>
              </div>

              {/* Rest timer overlay */}
              {restRemaining > 0 && (
                <div className="bg-slate-800 border border-amber-500/50 rounded-xl p-4 shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-amber-400 flex items-center gap-1.5">
                      {restType === 'exercise' ? <><LuRefreshCw className="w-4 h-4" /> Descanso entre ejercicios</> : <><LuHourglass className="w-4 h-4" /> Descanso entre series</>}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setRestRemaining((prev) => prev + 10)}
                        className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded-full transition"
                      >
                        +10s
                      </button>
                      <button
                        type="button"
                        onClick={skipRest}
                        className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded-full transition"
                      >
                        Saltar <LuSkipForward className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="text-4xl font-mono font-bold text-amber-400 tabular-nums">
                      {fmtTime(restRemaining)}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-slate-700 rounded-full h-2 mt-3 overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-1000"
                      style={{ width: `${restProgress * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── Rest Configuration ─── */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[140px]">
                <input
                  type="date"
                  className="w-full bg-slate-700 rounded-lg px-3 py-2"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <div className="flex-1 min-w-[140px]">
                <select
                  className="w-full bg-slate-700 rounded-lg px-3 py-2"
                  value={form.feeling}
                  onChange={(e) => setForm({ ...form, feeling: e.target.value })}
                >
                  {FEELINGS.map((f) => (
                    <option key={f.v} value={f.v}>{f.l}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Timer configuration */}
            <div className="border-t border-slate-700 pt-3">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5"><LuTimer className="w-4 h-4" /> Temporizadores de descanso</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">
                    Entre series: <span className="text-white font-semibold">{restBetweenSets}s</span>
                  </label>
                  <input
                    type="range"
                    min="15"
                    max="300"
                    step="15"
                    className="w-full accent-primary"
                    value={restBetweenSets}
                    onChange={(e) => setRestBetweenSets(+e.target.value)}
                  />
                  <div className="flex justify-between text-[10px] text-gray-500">
                    <span>15s</span><span>1m</span><span>2m</span><span>3m</span><span>5m</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">
                    Entre ejercicios: <span className="text-white font-semibold">{restBetweenExercises}s</span>
                  </label>
                  <input
                    type="range"
                    min="30"
                    max="600"
                    step="30"
                    className="w-full accent-amber-500"
                    value={restBetweenExercises}
                    onChange={(e) => setRestBetweenExercises(+e.target.value)}
                  />
                  <div className="flex justify-between text-[10px] text-gray-500">
                    <span>30s</span><span>2m</span><span>5m</span><span>8m</span><span>10m</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Start workout button */}
            {!isActive && form.exercises.length > 0 && (
              <button
                type="button"
                onClick={startWorkout}
                className="w-full bg-green-600 hover:bg-green-700 py-3 rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2"
              >
                <LuPlay className="w-5 h-5" /> Iniciar Entrenamiento
              </button>
            )}
          </div>

          {/* ─── Exercises ─── */}
          {form.exercises.map((ex, i) => {
            const exName = exercises.find((e) => e._id === ex.exercise)?.name;
            return (
              <div key={i} className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                {/* Exercise header */}
                <div className="bg-slate-700/50 px-4 py-2 flex items-center justify-between">
                  <span className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
                    Ejercicio {i + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const copy = [...form.exercises];
                      copy.splice(i, 1);
                      setForm({ ...form, exercises: copy });
                    }}
                    className="text-gray-500 hover:text-red-400 text-sm transition"
                  >
                    ✕
                  </button>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex gap-2">
                    <select
                      className="bg-slate-700 rounded-lg px-3 py-2 flex-1"
                      value={ex.exercise}
                      onChange={(e) => {
                        const copy = [...form.exercises];
                        copy[i].exercise = e.target.value;
                        setForm({ ...form, exercises: copy });
                      }}
                    >
                      {exercises.map((opt) => (
                        <option key={opt._id} value={opt._id}>{opt.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        const found = exercises.find((e) => e._id === ex.exercise);
                        if (found) setPreviewExercise(found);
                      }}
                      className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-lg text-sm transition shrink-0"
                      title="Ver cómo se hace"
                    >
                      <LuEye className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Column headers */}
                  <div className="flex gap-2 text-xs text-gray-400 font-semibold items-center">
                    <span className="w-16"></span>
                    <span className="w-20 text-center">Reps</span>
                    <span className="w-20 text-center">Peso (kg)</span>
                    {isActive && <span className="w-10 text-center">Hecho</span>}
                  </div>

                  {ex.sets.map((s, si) => {
                    const isDone = completedSets[`${i}-${si}`];
                    return (
                      <div
                        key={si}
                        className={`flex gap-2 text-sm items-center rounded-lg px-1 py-1 transition ${isDone ? 'bg-green-900/20' : ''
                          }`}
                      >
                        <span className={`w-16 text-sm ${isDone ? 'text-green-400' : 'text-gray-400'}`}>
                          Serie {s.setNumber}
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="Reps"
                          className={`bg-slate-700 rounded-lg px-2 py-1.5 w-20 text-center outline-none focus:ring-2 focus:ring-primary ${isDone ? 'opacity-60' : ''
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
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="kg"
                          className={`bg-slate-700 rounded-lg px-2 py-1.5 w-20 text-center outline-none focus:ring-2 focus:ring-primary ${isDone ? 'opacity-60' : ''
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
                        {/* Check button — only visible when workout is active */}
                        {isActive && (
                          <button
                            type="button"
                            onClick={() => completeSet(i, si)}
                            disabled={isDone}
                            className={`w-10 h-8 rounded-lg flex items-center justify-center text-lg transition ${isDone
                              ? 'bg-green-600 text-white cursor-default'
                              : 'bg-slate-700 hover:bg-green-600 hover:text-white text-gray-400'
                              }`}
                            title={isDone ? 'Completada' : 'Marcar como completada'}
                          >
                            ✓
                          </button>
                        )}
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    className="text-xs text-accent hover:underline"
                    onClick={() => {
                      const copy = [...form.exercises];
                      copy[i].sets.push({ setNumber: copy[i].sets.length + 1, reps: 10, weight: 0 });
                      setForm({ ...form, exercises: copy });
                    }}
                  >
                    + Agregar Serie
                  </button>
                </div>
              </div>
            );
          })}

          <button type="button" onClick={addExercise} className="text-sm text-primary hover:underline">
            + Agregar Ejercicio
          </button>

          <textarea
            placeholder="Notas / sensaciones…"
            rows={2}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary resize-none"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />

          {/* ─── Bottom action ─── */}
          {isActive ? (
            <button
              type="button"
              onClick={finishWorkout}
              className="w-full bg-red-600 hover:bg-red-700 py-4 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2"
            >
              <LuSquare className="w-5 h-5" /> Terminar Entrenamiento ({fmtTime(elapsedSec)})
            </button>
          ) : (
            <button
              type="submit"
              className="w-full bg-primary hover:bg-indigo-600 py-3 rounded-xl font-semibold text-sm transition"
            >
              Guardar Entrenamiento
            </button>
          )}
        </form>
      )}

      {/* ─── Workout history ─── */}
      {!showForm && logs.length === 0 ? (
        <div className="animate-fadeInUp text-center py-20 space-y-5">
          <div className="relative inline-block">
            <div className="w-24 h-24 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl flex items-center justify-center mx-auto border border-primary/20">
              <LuActivity className="w-12 h-12 text-primary animate-float" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center border border-accent/30">
              <LuPlus className="w-4 h-4 text-accent" />
            </div>
          </div>
          <div>
            <p className="text-gray-300 text-xl font-semibold">Sin entrenamientos aún</p>
            <p className="text-gray-500 mt-1">Registra tu primera sesión y comienza a construir tu historial</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-primary to-indigo-600 hover:from-indigo-600 hover:to-primary px-8 py-3 rounded-2xl text-sm font-bold transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] inline-flex items-center gap-2"
          >
            <LuPlus className="w-5 h-5" /> Registrar mi primer entrenamiento
          </button>
        </div>
      ) : (
        !showForm && (
          <div className="space-y-4">
            {/* Section title */}
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-primary/15 rounded-xl flex items-center justify-center">
                <LuCalendar className="w-4 h-4 text-primary" />
              </div>
              <h2 className="text-lg font-bold">Historial de Sesiones</h2>
              <div className="flex-1 h-px bg-gradient-to-r from-slate-700 to-transparent" />
            </div>

            {logs.map((log, idx) => {
              const feeling = FEELINGS.find((f) => f.v === log.feeling) || FEELINGS[1];
              const FeelingIcon = feeling.Icon;
              const feelingGradient = FEELING_COLORS[log.feeling] || FEELING_COLORS.good;
              const exerciseNames = log.exercises.map((e) => e.exercise?.name || 'Ejercicio');
              const totalSets = log.exercises.reduce((sum, e) => sum + (e.sets?.length || 0), 0);
              const maxWeight = log.exercises.reduce((max, e) => {
                const exMax = (e.sets || []).reduce((m, s) => Math.max(m, s.weight || 0), 0);
                return Math.max(max, exMax);
              }, 0);

              return (
                <div
                  key={log._id}
                  className="animate-fadeInUp group bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  {/* Top accent bar with gradient */}
                  <div className={`h-1 bg-gradient-to-r ${feelingGradient}`} />

                  <div className="p-5">
                    {/* Header row */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {/* Date badge */}
                        <div className="bg-slate-700/60 rounded-xl px-3 py-2 text-center border border-slate-600/30 min-w-[60px]">
                          <p className="text-lg font-bold text-white leading-none">
                            {new Date(log.date).getDate()}
                          </p>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">
                            {new Date(log.date).toLocaleDateString('es', { month: 'short' })}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">
                            {new Date(log.date).toLocaleDateString('es', { weekday: 'long' })}
                          </p>
                          <p className="font-bold text-white mt-0.5 line-clamp-1">
                            {exerciseNames.length <= 3
                              ? exerciseNames.join(', ')
                              : `${exerciseNames.slice(0, 3).join(', ')} +${exerciseNames.length - 3} más`}
                          </p>
                        </div>
                      </div>

                      {/* Feeling badge */}
                      <div className={`flex items-center gap-1.5 bg-gradient-to-r ${feelingGradient} px-3 py-1.5 rounded-full text-xs font-bold shadow-md`}>
                        <FeelingIcon className="w-3.5 h-3.5" />
                        <span>{feeling.l}</span>
                      </div>
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                      {log.durationMinutes > 0 && (
                        <div className="bg-slate-700/40 rounded-xl px-3 py-2.5 border border-slate-600/20 flex items-center gap-2">
                          <div className="w-7 h-7 bg-blue-500/15 rounded-lg flex items-center justify-center shrink-0">
                            <LuClock className="w-3.5 h-3.5 text-blue-400" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{log.durationMinutes} min</p>
                            <p className="text-[10px] text-gray-500">Duración</p>
                          </div>
                        </div>
                      )}
                      <div className="bg-slate-700/40 rounded-xl px-3 py-2.5 border border-slate-600/20 flex items-center gap-2">
                        <div className="w-7 h-7 bg-primary/15 rounded-lg flex items-center justify-center shrink-0">
                          <LuDumbbell className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{log.exercises.length}</p>
                          <p className="text-[10px] text-gray-500">Ejercicios</p>
                        </div>
                      </div>
                      {totalSets > 0 && (
                        <div className="bg-slate-700/40 rounded-xl px-3 py-2.5 border border-slate-600/20 flex items-center gap-2">
                          <div className="w-7 h-7 bg-emerald-500/15 rounded-lg flex items-center justify-center shrink-0">
                            <LuTarget className="w-3.5 h-3.5 text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{totalSets}</p>
                            <p className="text-[10px] text-gray-500">Series</p>
                          </div>
                        </div>
                      )}
                      <div className="bg-slate-700/40 rounded-xl px-3 py-2.5 border border-slate-600/20 flex items-center gap-2">
                        <div className="w-7 h-7 bg-orange-500/15 rounded-lg flex items-center justify-center shrink-0">
                          <LuFlame className="w-3.5 h-3.5 text-orange-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{log.caloriesBurned || 0} kcal</p>
                          <p className="text-[10px] text-gray-500">Calorías</p>
                        </div>
                      </div>
                      {maxWeight > 0 && (
                        <div className="bg-slate-700/40 rounded-xl px-3 py-2.5 border border-slate-600/20 flex items-center gap-2">
                          <div className="w-7 h-7 bg-amber-500/15 rounded-lg flex items-center justify-center shrink-0">
                            <LuTrendingUp className="w-3.5 h-3.5 text-amber-400" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{maxWeight} kg</p>
                            <p className="text-[10px] text-gray-500">Peso máx.</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Exercise pills */}
                    <div className="flex flex-wrap gap-1.5">
                      {exerciseNames.map((name, i) => (
                        <span
                          key={i}
                          className="bg-gradient-to-r from-primary/10 to-indigo-500/10 text-primary text-[11px] px-2.5 py-1 rounded-lg font-medium border border-primary/15"
                        >
                          {name}
                        </span>
                      ))}
                    </div>

                    {/* Notes */}
                    {log.notes && (
                      <p className="text-sm text-gray-400 mt-3 pl-3 border-l-2 border-primary/30 italic">
                        {log.notes}
                      </p>
                    )}
=======
        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* ─── Chronometer & Rest Timer Bar ─── */}
            {isActive && (
              <div className="sticky top-0 z-30 space-y-2">
                {/* Main chronometer */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex items-center justify-between shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs text-gray-400 uppercase tracking-wide">Entrenamiento en curso</span>
                  </div>
                  <span className="text-2xl font-mono font-bold text-white tabular-nums">
                    {fmtTime(elapsedSec)}
                  </span>
                </div>

                {/* Rest timer overlay */}
                {restRemaining > 0 && (
                  <div className="bg-slate-800 border border-amber-500/50 rounded-xl p-4 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-amber-400 flex items-center gap-1.5">
                        {restType === 'exercise' ? <><LuRefreshCw className="w-4 h-4" /> Descanso entre ejercicios</> : <><LuHourglass className="w-4 h-4" /> Descanso entre series</>}
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setRestRemaining((prev) => prev + 10)}
                          className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded-full transition"
                        >
                          +10s
                        </button>
                        <button
                          type="button"
                          onClick={skipRest}
                          className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded-full transition"
                        >
                          Saltar <LuSkipForward className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="text-center">
                      <span className="text-4xl font-mono font-bold text-amber-400 tabular-nums">
                        {fmtTime(restRemaining)}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-slate-700 rounded-full h-2 mt-3 overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all duration-1000"
                        style={{ width: `${restProgress * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ─── Rest Configuration ─── */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-4">
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[140px]">
                  <input
                    type="date"
                    className="w-full bg-slate-700 rounded-lg px-3 py-2"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>
                <div className="flex-1 min-w-[140px]">
                  <select
                    className="w-full bg-slate-700 rounded-lg px-3 py-2"
                    value={form.feeling}
                    onChange={(e) => setForm({ ...form, feeling: e.target.value })}
                  >
                    {FEELINGS.map((f) => (
                      <option key={f.v} value={f.v}>{f.l}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Timer configuration */}
              <div className="border-t border-slate-700 pt-3">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5"><LuTimer className="w-4 h-4" /> Temporizadores de descanso</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">
                      Entre series: <span className="text-white font-semibold">{restBetweenSets}s</span>
                    </label>
                    <input
                      type="range"
                      min="15"
                      max="300"
                      step="15"
                      className="w-full accent-primary"
                      value={restBetweenSets}
                      onChange={(e) => setRestBetweenSets(+e.target.value)}
                    />
                    <div className="flex justify-between text-[10px] text-gray-500">
                      <span>15s</span><span>1m</span><span>2m</span><span>3m</span><span>5m</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">
                      Entre ejercicios: <span className="text-white font-semibold">{restBetweenExercises}s</span>
                    </label>
                    <input
                      type="range"
                      min="30"
                      max="600"
                      step="30"
                      className="w-full accent-amber-500"
                      value={restBetweenExercises}
                      onChange={(e) => setRestBetweenExercises(+e.target.value)}
                    />
                    <div className="flex justify-between text-[10px] text-gray-500">
                      <span>30s</span><span>2m</span><span>5m</span><span>8m</span><span>10m</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Start workout button */}
              {!isActive && form.exercises.length > 0 && (
                <button
                  type="button"
                  onClick={startWorkout}
                  className="w-full bg-green-600 hover:bg-green-700 py-3 rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2"
                >
                  <LuPlay className="w-5 h-5" /> Iniciar Entrenamiento
                </button>
              )}
            </div>

            {/* ─── Exercises ─── */}
            {form.exercises.map((ex, i) => {
              const exName = exercises.find((e) => e._id === ex.exercise)?.name;
              return (
                <div key={i} className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                  {/* Exercise header */}
                  <div className="bg-slate-700/50 px-4 py-2 flex items-center justify-between">
                    <span className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
                      Ejercicio {i + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const copy = [...form.exercises];
                        copy.splice(i, 1);
                        setForm({ ...form, exercises: copy });
                      }}
                      className="text-gray-500 hover:text-red-400 text-sm transition"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex gap-2">
                      <select
                        className="bg-slate-700 rounded-lg px-3 py-2 flex-1"
                        value={ex.exercise}
                        onChange={(e) => {
                          const copy = [...form.exercises];
                          copy[i].exercise = e.target.value;
                          setForm({ ...form, exercises: copy });
                        }}
                      >
                        {exercises.map((opt) => (
                          <option key={opt._id} value={opt._id}>{opt.name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const found = exercises.find((e) => e._id === ex.exercise);
                          if (found) setPreviewExercise(found);
                        }}
                        className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-lg text-sm transition shrink-0"
                        title="Ver cómo se hace"
                      >
                        <LuEye className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Column headers */}
                    <div className="flex gap-2 text-xs text-gray-400 font-semibold items-center">
                      <span className="w-16"></span>
                      <span className="w-20 text-center">Reps</span>
                      <span className="w-20 text-center">Peso (kg)</span>
                      {isActive && <span className="w-10 text-center">Hecho</span>}
                    </div>

                    {ex.sets.map((s, si) => {
                      const isDone = completedSets[`${i}-${si}`];
                      return (
                        <div
                          key={si}
                          className={`flex gap-2 text-sm items-center rounded-lg px-1 py-1 transition ${isDone ? 'bg-green-900/20' : ''
                            }`}
                        >
                          <span className={`w-16 text-sm ${isDone ? 'text-green-400' : 'text-gray-400'}`}>
                            Serie {s.setNumber}
                          </span>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="Reps"
                            className={`bg-slate-700 rounded-lg px-2 py-1.5 w-20 text-center outline-none focus:ring-2 focus:ring-primary ${isDone ? 'opacity-60' : ''
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
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="kg"
                            className={`bg-slate-700 rounded-lg px-2 py-1.5 w-20 text-center outline-none focus:ring-2 focus:ring-primary ${isDone ? 'opacity-60' : ''
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
                          {/* Check button — only visible when workout is active */}
                          {isActive && (
                            <button
                              type="button"
                              onClick={() => completeSet(i, si)}
                              disabled={isDone}
                              className={`w-10 h-8 rounded-lg flex items-center justify-center text-lg transition ${isDone
                                ? 'bg-green-600 text-white cursor-default'
                                : 'bg-slate-700 hover:bg-green-600 hover:text-white text-gray-400'
                                }`}
                              title={isDone ? 'Completada' : 'Marcar como completada'}
                            >
                              ✓
                            </button>
                          )}
                        </div>
                      );
                    })}

                    <button
                      type="button"
                      className="text-xs text-accent hover:underline"
                      onClick={() => {
                        const copy = [...form.exercises];
                        copy[i].sets.push({ setNumber: copy[i].sets.length + 1, reps: 10, weight: 0 });
                        setForm({ ...form, exercises: copy });
                      }}
                    >
                      + Agregar Serie
                    </button>
>>>>>>> 319b4ba (Initial project import: AI gym trainer app (backend, frontend, seed, AI logic, Docker, docs))
                  </div>
                </div>
              );
            })}
<<<<<<< HEAD
          </div>
        )
      )}
=======

            <button type="button" onClick={addExercise} className="text-sm text-primary hover:underline">
              + Agregar Ejercicio
            </button>

            <textarea
              placeholder="Notas / sensaciones…"
              rows={2}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary resize-none"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />

            {/* ─── Bottom action ─── */}
            {isActive ? (
              <button
                type="button"
                onClick={finishWorkout}
                className="w-full bg-red-600 hover:bg-red-700 py-4 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2"
              >
                <LuSquare className="w-5 h-5" /> Terminar Entrenamiento ({fmtTime(elapsedSec)})
              </button>
            ) : (
              <button
                type="submit"
                className="w-full bg-primary hover:bg-indigo-600 py-3 rounded-xl font-semibold text-sm transition"
              >
                Guardar Entrenamiento
              </button>
            )}
          </form>
        )}

        {/* ─── Workout history ─── */}
        {!showForm && logs.length === 0 ? (
          <div className="animate-fadeInUp text-center py-20 space-y-5">
            <div className="relative inline-block">
              <div className="w-24 h-24 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl flex items-center justify-center mx-auto border border-primary/20">
                <LuActivity className="w-12 h-12 text-primary animate-float" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center border border-accent/30">
                <LuPlus className="w-4 h-4 text-accent" />
              </div>
            </div>
            <div>
              <p className="text-gray-300 text-xl font-semibold">Sin entrenamientos aún</p>
              <p className="text-gray-500 mt-1">Registra tu primera sesión y comienza a construir tu historial</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-primary to-indigo-600 hover:from-indigo-600 hover:to-primary px-8 py-3 rounded-2xl text-sm font-bold transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] inline-flex items-center gap-2"
            >
              <LuPlus className="w-5 h-5" /> Registrar mi primer entrenamiento
            </button>
          </div>
        ) : (
          !showForm && (
            <div className="space-y-4">
              {/* Section title */}
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-primary/15 rounded-xl flex items-center justify-center">
                  <LuCalendar className="w-4 h-4 text-primary" />
                </div>
                <h2 className="text-lg font-bold">Historial de Sesiones</h2>
                <div className="flex-1 h-px bg-gradient-to-r from-slate-700 to-transparent" />
              </div>

              {logs.map((log, idx) => {
                const feeling = FEELINGS.find((f) => f.v === log.feeling) || FEELINGS[1];
                const FeelingIcon = feeling.Icon;
                const feelingGradient = FEELING_COLORS[log.feeling] || FEELING_COLORS.good;
                const exerciseNames = log.exercises.map((e) => e.exercise?.name || 'Ejercicio');
                const totalSets = log.exercises.reduce((sum, e) => sum + (e.sets?.length || 0), 0);
                const maxWeight = log.exercises.reduce((max, e) => {
                  const exMax = (e.sets || []).reduce((m, s) => Math.max(m, s.weight || 0), 0);
                  return Math.max(max, exMax);
                }, 0);

                return (
                  <div
                    key={log._id}
                    className="animate-fadeInUp group bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
                    style={{ animationDelay: `${idx * 0.05}s` }}
                  >
                    {/* Top accent bar with gradient */}
                    <div className={`h-1 bg-gradient-to-r ${feelingGradient}`} />

                    <div className="p-5">
                      {/* Header row */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          {/* Date badge */}
                          <div className="bg-slate-700/60 rounded-xl px-3 py-2 text-center border border-slate-600/30 min-w-[60px]">
                            <p className="text-lg font-bold text-white leading-none">
                              {new Date(log.date).getDate()}
                            </p>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">
                              {new Date(log.date).toLocaleDateString('es', { month: 'short' })}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">
                              {new Date(log.date).toLocaleDateString('es', { weekday: 'long' })}
                            </p>
                            <p className="font-bold text-white mt-0.5 line-clamp-1">
                              {exerciseNames.length <= 3
                                ? exerciseNames.join(', ')
                                : `${exerciseNames.slice(0, 3).join(', ')} +${exerciseNames.length - 3} más`}
                            </p>
                          </div>
                        </div>

                        {/* Feeling badge */}
                        <div className={`flex items-center gap-1.5 bg-gradient-to-r ${feelingGradient} px-3 py-1.5 rounded-full text-xs font-bold shadow-md`}>
                          <FeelingIcon className="w-3.5 h-3.5" />
                          <span>{feeling.l}</span>
                        </div>
                      </div>

                      {/* Stats grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                        {log.durationMinutes > 0 && (
                          <div className="bg-slate-700/40 rounded-xl px-3 py-2.5 border border-slate-600/20 flex items-center gap-2">
                            <div className="w-7 h-7 bg-blue-500/15 rounded-lg flex items-center justify-center shrink-0">
                              <LuClock className="w-3.5 h-3.5 text-blue-400" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">{log.durationMinutes} min</p>
                              <p className="text-[10px] text-gray-500">Duración</p>
                            </div>
                          </div>
                        )}
                        <div className="bg-slate-700/40 rounded-xl px-3 py-2.5 border border-slate-600/20 flex items-center gap-2">
                          <div className="w-7 h-7 bg-primary/15 rounded-lg flex items-center justify-center shrink-0">
                            <LuDumbbell className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{log.exercises.length}</p>
                            <p className="text-[10px] text-gray-500">Ejercicios</p>
                          </div>
                        </div>
                        {totalSets > 0 && (
                          <div className="bg-slate-700/40 rounded-xl px-3 py-2.5 border border-slate-600/20 flex items-center gap-2">
                            <div className="w-7 h-7 bg-emerald-500/15 rounded-lg flex items-center justify-center shrink-0">
                              <LuTarget className="w-3.5 h-3.5 text-emerald-400" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">{totalSets}</p>
                              <p className="text-[10px] text-gray-500">Series</p>
                            </div>
                          </div>
                        )}
                        <div className="bg-slate-700/40 rounded-xl px-3 py-2.5 border border-slate-600/20 flex items-center gap-2">
                          <div className="w-7 h-7 bg-orange-500/15 rounded-lg flex items-center justify-center shrink-0">
                            <LuFlame className="w-3.5 h-3.5 text-orange-400" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{log.caloriesBurned || 0} kcal</p>
                            <p className="text-[10px] text-gray-500">Calorías</p>
                          </div>
                        </div>
                        {maxWeight > 0 && (
                          <div className="bg-slate-700/40 rounded-xl px-3 py-2.5 border border-slate-600/20 flex items-center gap-2">
                            <div className="w-7 h-7 bg-amber-500/15 rounded-lg flex items-center justify-center shrink-0">
                              <LuTrendingUp className="w-3.5 h-3.5 text-amber-400" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">{maxWeight} kg</p>
                              <p className="text-[10px] text-gray-500">Peso máx.</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Exercise pills */}
                      <div className="flex flex-wrap gap-1.5">
                        {exerciseNames.map((name, i) => (
                          <span
                            key={i}
                            className="bg-gradient-to-r from-primary/10 to-indigo-500/10 text-primary text-[11px] px-2.5 py-1 rounded-lg font-medium border border-primary/15"
                          >
                            {name}
                          </span>
                        ))}
                      </div>

                      {/* Notes */}
                      {log.notes && (
                        <p className="text-sm text-gray-400 mt-3 pl-3 border-l-2 border-primary/30 italic">
                          {log.notes}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
>>>>>>> 319b4ba (Initial project import: AI gym trainer app (backend, frontend, seed, AI logic, Docker, docs))
      </div>

      {/* ── Exercise Preview Modal ── */}
      {previewExercise && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setPreviewExercise(null)}
        >
          <div
            className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-bold truncate">{previewExercise.name}</h3>
              <button
                onClick={() => setPreviewExercise(null)}
                className="text-gray-400 hover:text-white bg-slate-700 hover:bg-slate-600 w-8 h-8 rounded-lg flex items-center justify-center transition shrink-0"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* YouTube Video */}
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

              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                <span className="bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-full capitalize">
                  {previewExercise.muscleGroup}
                </span>
                <span className="bg-slate-700 text-xs px-2.5 py-1 rounded-full capitalize">
                  {previewExercise.difficulty === 'beginner' ? 'Principiante' : previewExercise.difficulty === 'intermediate' ? 'Intermedio' : 'Avanzado'}
                </span>
                <span className="bg-slate-700 text-xs px-2.5 py-1 rounded-full capitalize">
                  {previewExercise.equipment}
                </span>
              </div>

              {/* Description */}
              {previewExercise.description && (
                <p className="text-sm text-gray-300">{previewExercise.description}</p>
              )}

              {/* Instructions */}
              {previewExercise.instructions?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><LuClipboardList className="w-4 h-4" /> Instrucciones</h4>
                  <ol className="list-decimal list-inside space-y-1.5">
                    {previewExercise.instructions.map((step, i) => (
                      <li key={i} className="text-sm text-gray-300">{step}</li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Tips */}
              {previewExercise.tips?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><LuLightbulb className="w-4 h-4" /> Consejos</h4>
                  <ul className="space-y-1.5">
                    {previewExercise.tips.map((tip, i) => (
                      <li key={i} className="text-sm text-gray-300 flex gap-2">
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

      {/* ── Motivational Modal ── */}
      {motivationalMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-gradient-to-br from-slate-800 via-slate-800 to-indigo-900/50 border border-primary/30 rounded-2xl w-full max-w-md shadow-2xl shadow-primary/20 animate-slideUp text-center p-8 space-y-5">
            {/* Animated icon */}
            <div className="animate-bounce"><motivationalMsg.Icon className="w-16 h-16 mx-auto text-primary" /></div>

            <h2 className="text-2xl font-extrabold text-white">
              ¡Entrenamiento Completado!
            </h2>

            <p className="text-lg text-gray-200 italic leading-relaxed">
              "{motivationalMsg.text}"
            </p>

            {/* Workout summary */}
            {workoutSummary && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-slate-700/60 rounded-xl p-3">
                  <p className="text-2xl font-bold text-primary">{workoutSummary.duration}</p>
                  <p className="text-xs text-gray-400">Duración</p>
                </div>
                <div className="bg-slate-700/60 rounded-xl p-3">
                  <p className="text-2xl font-bold text-accent">{workoutSummary.exerciseCount}</p>
                  <p className="text-xs text-gray-400">Ejercicios</p>
                </div>
                <div className="bg-slate-700/60 rounded-xl p-3">
                  <p className="text-2xl font-bold text-green-400">{workoutSummary.totalSets}</p>
                  <p className="text-xs text-gray-400">Series</p>
                </div>
                <div className="bg-slate-700/60 rounded-xl p-3">
                  <p className="text-2xl font-bold text-orange-400 flex items-center justify-center gap-1"><LuFlame className="w-6 h-6" /> {workoutSummary.caloriesBurned}</p>
                  <p className="text-xs text-gray-400">Calorías (est.)</p>
                </div>
              </div>
            )}

            <button
              onClick={() => { setMotivationalMsg(null); setWorkoutSummary(null); }}
              className="w-full bg-primary hover:bg-indigo-600 py-3 rounded-xl font-bold text-sm transition-all hover:scale-[1.02] active:scale-95"
            >
              ¡Vamos! <LuDumbbell className="inline w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
