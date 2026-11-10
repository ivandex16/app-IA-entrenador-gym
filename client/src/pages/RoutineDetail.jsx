import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import RestConfigPanel from '../components/workouts/RestConfigPanel';
import useRestDefaults from '../components/workouts/useRestDefaults';
import { fmtPreset } from '../components/workouts/workoutUtils';
import ExercisePickerPanel from '../components/exercises/ExercisePickerPanel';
import {
  LuActivity,
  LuDumbbell,
  LuFlame,
  LuHeart,
  LuSparkles,
  LuZap,
  LuPencil,
  LuTrash2,
  LuCalendar,
  LuClipboardList,
  LuTimer,
  LuTriangleAlert,
  LuPlay,
  LuChartBar,
  LuSave,
  LuPlus,
  LuArrowLeft,
  LuArrowRight,
  LuChevronDown,
  LuChevronLeft,
  LuChevronRight,
  LuX,
  LuGripVertical,
} from 'react-icons/lu';

const GOALS = [
  { v: 'general', l: 'General', Icon: LuActivity },
  { v: 'muscle_gain', l: 'Ganar músculo', Icon: LuDumbbell },
  { v: 'fat_loss', l: 'Perder grasa', Icon: LuFlame },
  { v: 'endurance', l: 'Resistencia', Icon: LuHeart },
  { v: 'toning', l: 'Tonificación', Icon: LuSparkles },
  { v: 'strength', l: 'Fuerza', Icon: LuZap },
];

const WEEKDAYS = [
  { v: 'lunes', l: 'Lun', full: 'Lunes' },
  { v: 'martes', l: 'Mar', full: 'Martes' },
  { v: 'miercoles', l: 'Mié', full: 'Miércoles' },
  { v: 'jueves', l: 'Jue', full: 'Jueves' },
  { v: 'viernes', l: 'Vie', full: 'Viernes' },
  { v: 'sabado', l: 'Sáb', full: 'Sábado' },
  { v: 'domingo', l: 'Dom', full: 'Domingo' },
];

const REST_PRESETS = [
  { label: '45s', value: 45 },
  { label: '60s', value: 60 },
  { label: '90s', value: 90 },
  { label: '2 min', value: 120 },
  { label: '3 min', value: 180 },
];

function getDayCardSubtext(dayLabel, index) {
  if (!dayLabel) return `D${index + 1}`;
  const lower = dayLabel.toLowerCase();
  for (const w of WEEKDAYS) {
    if (
      lower.includes(w.v) ||
      lower.includes(w.full.toLowerCase()) ||
      lower.includes(w.l.toLowerCase())
    ) {
      return w.l.toUpperCase();
    }
  }
  const firstWord = dayLabel.trim().split(/[\s—–-]+/)[0];
  return firstWord.length <= 4 ? firstWord.toUpperCase() : firstWord.slice(0, 3).toUpperCase();
}

function estimateDuration(exercises) {
  if (!exercises || exercises.length === 0) return 0;
  return exercises.reduce((total, ex) => {
    const setTime = (ex.sets || 3) * 1.5;
    const restTime = ((ex.sets || 3) - 1) * ((ex.restSeconds || 90) / 60);
    return total + setTime + restTime;
  }, 0);
}

function formatDuration(min) {
  if (min < 1) return '—';
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function serializeExercises(exercises) {
  return exercises
    .filter((e) => e.exercise?._id || e.exercise)
    .map((e, i) => ({
      exercise: e.exercise?._id || e.exercise,
      order: i,
      sets: e.sets,
      repsMin: e.repsMin,
      repsMax: e.repsMax,
      weight: e.weight || 0,
      restSeconds: e.restSeconds,
      notes: e.notes || '',
    }));
}

export default function RoutineDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [routine, setRoutine] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', goal: 'general' });
  const [showPicker, setShowPicker] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeDay, setActiveDay] = useState(0);
  const [editingDayLabel, setEditingDayLabel] = useState(null);
  const [dayLabelValue, setDayLabelValue] = useState('');
  const [showAddDay, setShowAddDay] = useState(false);

  // — Rest times chosen before starting (saved as the user's defaults) —
  const [restDefaults, setRestDefaults] = useRestDefaults();
  const [showRestSetup, setShowRestSetup] = useState(false);

  // — Days horizontal scroll & drag system —
  const daysScrollRef = useRef(null);
  const dayButtonRefs = useRef([]);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isPointerDown, setIsPointerDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftPos, setScrollLeftPos] = useState(0);

  // — Custom drag & drop state for exercises —
  const [dragState, setDragState] = useState(null);
  const [orderedIdxs, setOrderedIdxs] = useState(null);
  const currentYRef = useRef(0);
  const listRef = useRef(null);
  const itemRefs = useRef([]);

  const pickerRef = useRef(null);

  const load = async () => {
    const { data } = await api.get(`/routines/${id}`);
    setRoutine(data);
    setForm({ name: data.name, description: data.description || '', goal: data.goal });
    const dayCount = data.days?.length || 0;
    setActiveDay((prev) => (prev >= dayCount && dayCount > 0 ? dayCount - 1 : prev));
  };

  useEffect(() => {
    load();
  }, [id]);

  // Check scrollability of days container
  const checkDaysScrollability = useCallback(() => {
    const el = daysScrollRef.current;
    if (el) {
      const hasOverflow = el.scrollWidth > el.clientWidth + 2;
      setCanScrollLeft(hasOverflow && el.scrollLeft > 6);
      setCanScrollRight(hasOverflow && el.scrollLeft < el.scrollWidth - el.clientWidth - 6);
    }
  }, []);

  useEffect(() => {
    checkDaysScrollability();
    window.addEventListener('resize', checkDaysScrollability);
    return () => window.removeEventListener('resize', checkDaysScrollability);
  }, [checkDaysScrollability, routine?.days]);

  // Auto-scroll active day into view
  useEffect(() => {
    if (dayButtonRefs.current[activeDay]) {
      dayButtonRefs.current[activeDay].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
    checkDaysScrollability();
  }, [activeDay, checkDaysScrollability]);

  // Mouse wheel horizontal scroll
  const handleDaysWheel = (e) => {
    if (daysScrollRef.current && e.deltaY !== 0) {
      daysScrollRef.current.scrollLeft += e.deltaY;
      checkDaysScrollability();
    }
  };

  // Drag-to-scroll handlers for mouse users
  const handleDaysMouseDown = (e) => {
    if (!daysScrollRef.current) return;
    setIsPointerDown(true);
    setStartX(e.pageX - daysScrollRef.current.offsetLeft);
    setScrollLeftPos(daysScrollRef.current.scrollLeft);
  };

  const handleDaysMouseLeave = () => {
    setIsPointerDown(false);
  };

  const handleDaysMouseUp = () => {
    setIsPointerDown(false);
  };

  const handleDaysMouseMove = (e) => {
    if (!isPointerDown || !daysScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - daysScrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    daysScrollRef.current.scrollLeft = scrollLeftPos - walk;
    checkDaysScrollability();
  };

  const scrollDays = (direction) => {
    if (daysScrollRef.current) {
      const amount = direction === 'left' ? -220 : 220;
      daysScrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
      setTimeout(checkDaysScrollability, 300);
    }
  };

  // — Info editing —
  const saveInfo = async () => {
    setSaving(true);
    try {
      await api.put(`/routines/${id}`, form);
      toast.success('Rutina actualizada');
      setEditing(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  // Helper to get days
  const getDays = () => routine?.days || [];
  const getCurrentDayExercises = () => getDays()[activeDay]?.exercises || [];
  const getCurrentDayLabel = () => getDays()[activeDay]?.dayLabel || `Día ${activeDay + 1}`;

  // — Day management —
  const addDay = async (label) => {
    setSaving(true);
    try {
      const newDays = [...getDays(), { dayLabel: label, exercises: [] }];
      await api.put(`/routines/${id}`, {
        days: newDays.map((d) => ({
          dayLabel: d.dayLabel,
          exercises: serializeExercises(d.exercises || []),
        })),
      });
      await load();
      setActiveDay(newDays.length - 1);
      setShowAddDay(false);
      toast.success('Día agregado');
    } finally {
      setSaving(false);
    }
  };

  const removeDay = async (dayIdx) => {
    if (getDays().length <= 1) {
      toast.error('Debe haber al menos un día');
      return;
    }
    if (!confirm(`¿Eliminar "${getDays()[dayIdx]?.dayLabel}"?`)) return;
    setSaving(true);
    try {
      const newDays = getDays().filter((_, i) => i !== dayIdx);
      await api.put(`/routines/${id}`, {
        days: newDays.map((d) => ({
          dayLabel: d.dayLabel,
          exercises: serializeExercises(d.exercises || []),
        })),
      });
      if (activeDay >= newDays.length) setActiveDay(Math.max(0, newDays.length - 1));
      await load();
      toast.success('Día eliminado');
    } finally {
      setSaving(false);
    }
  };

  const saveDayLabel = async (dayIdx) => {
    if (!dayLabelValue.trim()) return;
    setSaving(true);
    try {
      const newDays = getDays().map((d, i) => ({
        dayLabel: i === dayIdx ? dayLabelValue.trim() : d.dayLabel,
        exercises: serializeExercises(d.exercises || []),
      }));
      await api.put(`/routines/${id}`, { days: newDays });
      await load();
      setEditingDayLabel(null);
      toast.success('Nombre del día actualizado');
    } finally {
      setSaving(false);
    }
  };

  // — Exercise operations (save to current day with optimistic 60fps UI) —
  const persistExercises = async (updated) => {
    setRoutine((prev) => {
      if (!prev) return prev;
      const updatedDays = (prev.days || []).map((d, i) =>
        i === activeDay ? { ...d, exercises: updated } : d
      );
      return { ...prev, days: updatedDays };
    });

    setSaving(true);
    try {
      const newDays = getDays().map((d, i) => ({
        dayLabel: d.dayLabel,
        exercises: i === activeDay ? serializeExercises(updated) : serializeExercises(d.exercises || []),
      }));
      await api.put(`/routines/${id}`, { days: newDays });
    } catch (err) {
      toast.error('Error al guardar: ' + (err.response?.data?.message || err.message));
      await load();
    } finally {
      setSaving(false);
    }
  };

  // Receives the exercise picked in the catalog picker (object with _id, name, muscleGroup…).
  const addExercise = async (picked) => {
    const exerciseId = picked?._id || picked;
    const existing = getCurrentDayExercises();
    if (existing.some((e) => (e.exercise?._id || e.exercise) === exerciseId)) {
      toast.error('Este ejercicio ya está en este día');
      return;
    }
    const fullEx = typeof picked === 'object' ? picked : null;
    const updated = [
      ...existing,
      {
        exercise: fullEx || exerciseId,
        order: existing.length,
        sets: 3,
        repsMin: 8,
        repsMax: 12,
        weight: 0,
        restSeconds: 90,
        notes: '',
      },
    ];
    await persistExercises(updated);
    toast.success('Ejercicio agregado');
    setExpandedIdx(updated.length - 1);
  };

  const removeExercise = async (idx) => {
    if (!confirm('¿Eliminar este ejercicio de la rutina?')) return;
    const updated = getCurrentDayExercises().filter((_, i) => i !== idx);
    await persistExercises(updated);
    toast.success('Ejercicio eliminado');
    if (expandedIdx === idx) setExpandedIdx(null);
  };

  const updateField = async (idx, field, value) => {
    const updated = [...getCurrentDayExercises()];
    updated[idx] = { ...updated[idx], [field]: value };
    await persistExercises(updated);
  };

  const moveExercise = async (idx, direction) => {
    const exercises = getCurrentDayExercises();
    const target = idx + direction;
    if (target < 0 || target >= exercises.length) return;
    const arr = [...exercises];
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    await persistExercises(arr);
    setExpandedIdx(target);
  };

  // — Custom drag & drop for exercise cards —
  const getTargetIdx = useCallback((originalIdx, deltaY, itemHeight, total) => {
    const shift = Math.round(deltaY / itemHeight);
    return Math.max(0, Math.min(total - 1, originalIdx + shift));
  }, []);

  const onPointerDown = useCallback((e, idx) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const el = itemRefs.current[idx];
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setExpandedIdx(null);
    currentYRef.current = e.clientY;
    setDragState({ idx, startY: e.clientY, currentY: e.clientY, itemHeight: rect.height + 12 });
    setOrderedIdxs(null);
  }, []);

  useEffect(() => {
    if (!dragState) return;
    const { idx, startY, itemHeight } = dragState;
    const total = getCurrentDayExercises().length;

    const onMove = (e) => {
      const currentY = e.clientY;
      currentYRef.current = currentY;
      setDragState((prev) => (prev ? { ...prev, currentY } : null));
      const deltaY = currentY - startY;
      const target = getTargetIdx(idx, deltaY, itemHeight, total);
      if (target !== idx) {
        const arr = Array.from({ length: total }, (_, i) => i);
        const [moved] = arr.splice(idx, 1);
        arr.splice(target, 0, moved);
        setOrderedIdxs(arr);
      } else {
        setOrderedIdxs(null);
      }
    };

    const onUp = async () => {
      const deltaY = currentYRef.current - startY;
      const target = getTargetIdx(idx, deltaY, itemHeight, total);
      setDragState(null);
      setOrderedIdxs(null);
      if (target !== idx) {
        const arr = [...getCurrentDayExercises()];
        const [moved] = arr.splice(idx, 1);
        arr.splice(target, 0, moved);
        await persistExercises(arr);
        setExpandedIdx(target);
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragState?.idx, dragState?.startY, dragState?.itemHeight, routine?.days, activeDay]);

  // — Start current day's exercises in Workouts —
  const startDay = () => {
    const exercises = getCurrentDayExercises();
    const preloaded = exercises.map((e) => ({
      exercise: e.exercise?._id || e.exercise,
      // Rest between this exercise's sets, as set up in the routine (overrides the global value).
      restSeconds: Number(e.restSeconds) > 0 ? Number(e.restSeconds) : undefined,
      sets: Array.from({ length: e.sets }, (_, si) => ({
        setNumber: si + 1,
        reps: e.repsMin,
        weight: e.weight || 0,
      })),
    }));
    navigate('/workouts', {
      state: {
        preloaded,
        routineName: `${routine.name} — ${getCurrentDayLabel()}`,
        // Pre-configured rest times: the workout screen uses them as its initial plan.
        restConfig: restDefaults,
      },
    });
  };

  // — Delete routine —
  const handleDeleteRoutine = async () => {
    if (!confirm('¿Eliminar esta rutina por completo?')) return;
    await api.delete(`/routines/${id}`);
    toast.success('Rutina eliminada');
    navigate('/routines');
  };

  if (!routine) {
    return (
      <div className="min-h-screen bg-[#08090D] p-6">
        <div className="max-w-4xl mx-auto space-y-4 animate-pulse pt-8">
          <div className="h-6 bg-white/[0.05] rounded-xl w-36" />
          <div className="h-44 bg-[#0E1018] border border-white/[0.06] rounded-3xl" />
          <div className="h-14 bg-[#0E1018] border border-white/[0.06] rounded-2xl" />
          <div className="h-64 bg-[#0E1018] border border-white/[0.06] rounded-3xl" />
        </div>
      </div>
    );
  }

  const days = getDays();
  const exercises = getCurrentDayExercises();
  const goal = GOALS.find((g) => g.v === routine.goal) || GOALS[0];
  const duration = estimateDuration(exercises);
  const totalExercises = days.reduce((s, d) => s + (d.exercises?.length || 0), 0);
  const muscleGroups = [...new Set(exercises.map((e) => e.exercise?.muscleGroup).filter(Boolean))];
  const allMuscleGroups = [
    ...new Set(days.flatMap((d) => (d.exercises || []).map((e) => e.exercise?.muscleGroup).filter(Boolean))),
  ];


  return (
    <div className="min-h-screen bg-[#08090D] text-slate-100 pb-28 pt-4 px-4 sm:px-6 lg:px-8 selection:bg-lime-400 selection:text-slate-950 font-sans">
      {/* ── Ambient Athletic Lighting ── */}
      <div className="fixed top-0 left-1/4 w-[450px] h-[250px] bg-lime-400/[0.03] rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed top-20 right-1/4 w-[400px] h-[250px] bg-cyan-500/[0.03] rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-4xl mx-auto space-y-6">

        {/* ── 1. Back Link ── */}
        <div>
          <Link
            to="/routines"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-lime-400 transition-colors py-1 group"
          >
            <LuArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Volver a rutinas</span>
          </Link>
        </div>

        {/* ── 2. Routine Header / Info Card ── */}
        {editing ? (
          <div className="bg-[#0E1018] border border-white/10 p-6 sm:p-7 rounded-3xl space-y-4 shadow-2xl animate-fadeIn">
            <h2 className="text-base font-black uppercase tracking-tight text-white flex items-center gap-2">
              <LuPencil className="w-4 h-4 text-lime-400" />
              Editar Rutina
            </h2>
            <input
              className="w-full bg-[#131622] rounded-xl px-4 py-3 text-base font-bold text-white border border-white/10 focus:border-lime-400 focus:ring-1 focus:ring-lime-400/30 outline-none transition-all"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nombre de la rutina"
            />
            <textarea
              placeholder="Descripción (opcional)"
              rows={2}
              className="w-full bg-[#131622] rounded-xl px-4 py-3 text-sm text-zinc-300 border border-white/10 focus:border-lime-400 focus:ring-1 focus:ring-lime-400/30 outline-none transition-all resize-none"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[160px]">
                <label className="text-xs text-zinc-400 uppercase tracking-wider font-bold mb-1.5 block">
                  Objetivo
                </label>
                <select
                  className="w-full bg-[#131622] rounded-xl px-3.5 py-2.5 text-sm text-white border border-white/10 focus:border-lime-400 outline-none"
                  value={form.goal}
                  onChange={(e) => setForm({ ...form, goal: e.target.value })}
                >
                  {GOALS.map((g) => (
                    <option key={g.v} value={g.v} className="bg-[#0C0E15]">
                      {g.l}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2.5 pt-2">
              <button
                onClick={saveInfo}
                disabled={saving}
                className="min-h-[42px] px-6 py-2 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-black uppercase text-xs tracking-wider transition-all active:scale-95 shadow-md shadow-lime-400/20 disabled:opacity-50"
              >
                {saving ? 'Guardando…' : 'Guardar Cambios'}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-all active:scale-95"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="relative bg-[#0E1018] border border-white/[0.08] rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4 overflow-hidden">
            {/* Top athletic accent line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-lime-400/30 via-emerald-400/20 to-transparent" />

            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight truncate">
                  {routine.name}
                </h1>
                {routine.description && (
                  <p className="text-xs sm:text-sm text-zinc-400 mt-1 leading-relaxed max-w-2xl font-medium">
                    {routine.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setEditing(true)}
                  className="w-9 h-9 rounded-xl bg-white/[0.05] hover:bg-white/10 hover:border-lime-400/40 border border-white/[0.08] text-zinc-300 hover:text-white flex items-center justify-center transition-all duration-150 active:scale-90"
                  title="Editar información"
                  aria-label="Editar información"
                >
                  <LuPencil className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDeleteRoutine}
                  className="w-9 h-9 rounded-xl bg-white/[0.05] hover:bg-rose-500/20 hover:border-rose-500/40 border border-white/[0.08] text-zinc-300 hover:text-rose-400 flex items-center justify-center transition-all duration-150 active:scale-90"
                  title="Eliminar rutina"
                  aria-label="Eliminar rutina"
                >
                  <LuTrash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Stats Summary Chips */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-1">
              <span className="bg-[#131622] border border-white/[0.08] text-xs font-bold text-zinc-300 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                <LuCalendar className="w-4 h-4 text-lime-400" />
                <span>{days.length} {days.length === 1 ? 'día' : 'días'}</span>
              </span>
              <span className="bg-[#131622] border border-white/[0.08] text-xs font-bold text-zinc-300 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                <goal.Icon className="w-4 h-4 text-cyan-400" />
                <span>{goal.l}</span>
              </span>
              <span className="bg-[#131622] border border-white/[0.08] text-xs font-bold text-zinc-300 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                <LuClipboardList className="w-4 h-4 text-emerald-400" />
                <span>{totalExercises} ejercicios en total</span>
              </span>
            </div>

            {/* Muscle Groups Covered */}
            {allMuscleGroups.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {allMuscleGroups.map((mg) => (
                  <span
                    key={mg}
                    className="bg-zinc-800/80 text-zinc-300 border border-white/[0.06] text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg"
                  >
                    {mg}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 3. Training Days Selector (Touch/Drag/Snap Horizontal Slider) ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <LuCalendar className="w-4 h-4 text-lime-400" />
              Días de Entrenamiento
            </h2>
            <button
              onClick={() => setShowAddDay(!showAddDay)}
              className="border border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-lime-400/40 hover:text-lime-400 transition-all font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 active:scale-95"
            >
              {showAddDay ? (
                <>
                  <LuX className="w-3.5 h-3.5" />
                  <span>Cerrar</span>
                </>
              ) : (
                <>
                  <LuPlus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Agregar día</span>
                </>
              )}
            </button>
          </div>

          {/* Add Day Drawer Panel */}
          {showAddDay && (
            <div className="animate-slideUp bg-[#0E1018] border border-white/[0.08] rounded-2xl p-4 space-y-2.5 shadow-xl">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Selecciona un día para incorporar:
              </p>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.filter((wd) => !getDays().some((d) => d.dayLabel === wd.full)).map((wd) => (
                  <button
                    key={wd.v}
                    onClick={() => addDay(wd.full)}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#131622] border border-white/10 text-zinc-300 hover:border-lime-400 hover:text-lime-400 transition-all active:scale-95"
                  >
                    {wd.full}
                  </button>
                ))}
                {getDays().length >= 7 && (
                  <p className="text-xs text-zinc-500 font-medium">Ya has configurado todos los días de la semana</p>
                )}
              </div>
            </div>
          )}

          {/* Horizontal Days Strip with Smooth Scroll, Chevrons & Drag */}
          <div className="relative group">
            {/* Left Scroll Button */}
            {canScrollLeft && (
              <button
                type="button"
                onClick={() => scrollDays('left')}
                className="absolute -left-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-[#0E1018]/95 border border-white/20 text-white shadow-xl flex items-center justify-center hover:bg-lime-400 hover:text-black transition-all active:scale-90"
                aria-label="Desplazar días a la izquierda"
              >
                <LuChevronLeft className="w-4 h-4" />
              </button>
            )}

            {/* Left Edge Gradient Fade */}
            {canScrollLeft && (
              <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#08090D] to-transparent z-10 pointer-events-none" />
            )}

            {/* Scrollable Container (Compact Sports-Week Day Cards) */}
            <div
              ref={daysScrollRef}
              onScroll={checkDaysScrollability}
              onWheel={handleDaysWheel}
              onMouseDown={handleDaysMouseDown}
              onMouseLeave={handleDaysMouseLeave}
              onMouseUp={handleDaysMouseUp}
              onMouseMove={handleDaysMouseMove}
              className={`flex gap-2.5 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory py-1.5 px-1 select-none ${
                isPointerDown ? 'cursor-grabbing' : 'cursor-grab'
              }`}
            >
              {days.map((day, i) => {
                const active = activeDay === i;
                const subtext = getDayCardSubtext(day.dayLabel, i);
                const count = day.exercises?.length || 0;
                return (
                  <button
                    key={day._id || i}
                    ref={(el) => (dayButtonRefs.current[i] = el)}
                    onClick={() => {
                      setActiveDay(i);
                      setExpandedIdx(null);
                    }}
                    className={`snap-start relative w-24 sm:w-28 py-3 px-2 rounded-2xl flex flex-col items-center justify-center gap-1 shrink-0 border select-none transition-all duration-150 active:scale-95 ${
                      active
                        ? 'border-lime-400 bg-lime-400/10 text-lime-400 font-bold shadow-[0_0_15px_rgba(204,255,0,0.15)] ring-1 ring-lime-400/30'
                        : 'bg-[#0E1018] text-zinc-400 hover:text-white border-white/[0.08] hover:border-white/20 hover:bg-[#131622]'
                    }`}
                  >
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider ${
                        active ? 'text-lime-400/90' : 'text-zinc-500'
                      }`}
                    >
                      DÍA {i + 1}
                    </span>
                    <span
                      className={`text-base sm:text-lg font-black tracking-tight ${
                        active ? 'text-white' : 'text-zinc-200'
                      }`}
                    >
                      {subtext}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        active
                          ? 'bg-lime-400/20 text-lime-400 border-lime-400/30'
                          : 'bg-white/[0.04] text-zinc-400 border-white/[0.06]'
                      }`}
                    >
                      {count} ejerc
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Right Edge Gradient Fade */}
            {canScrollRight && (
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#08090D] to-transparent z-10 pointer-events-none" />
            )}

            {/* Right Scroll Button */}
            {canScrollRight && (
              <button
                type="button"
                onClick={() => scrollDays('right')}
                className="absolute -right-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-[#0E1018]/95 border border-white/20 text-white shadow-xl flex items-center justify-center hover:bg-lime-400 hover:text-black transition-all active:scale-90"
                aria-label="Desplazar días a la derecha"
              >
                <LuChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Unified Current Day Hero Card */}
          {days.length > 0 && (
            <div className="relative bg-[#0E1018] border border-white/[0.08] rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 overflow-hidden">
              {/* Top athletic accent line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-lime-400/40 via-emerald-400/20 to-transparent" />

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                {/* Day Title & Inline Edit */}
                {editingDayLabel === activeDay ? (
                  <div className="flex items-center gap-2 flex-1 max-w-md">
                    <input
                      className="bg-[#131622] rounded-xl px-3.5 py-2 text-sm text-white border border-lime-400/50 outline-none focus:ring-1 focus:ring-lime-400/40 flex-1 font-bold"
                      value={dayLabelValue}
                      onChange={(e) => setDayLabelValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveDayLabel(activeDay)}
                      autoFocus
                    />
                    <button
                      onClick={() => saveDayLabel(activeDay)}
                      className="text-xs font-black text-black bg-lime-400 hover:bg-lime-300 px-3 py-2 rounded-xl transition-colors"
                      title="Guardar nombre"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => setEditingDayLabel(null)}
                      className="text-xs font-bold text-zinc-400 hover:text-white px-2.5 py-2 rounded-xl"
                      title="Cancelar"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5">
                    <h3 className="font-black text-xl sm:text-2xl text-white uppercase tracking-tight">
                      {getCurrentDayLabel()}
                    </h3>
                    <button
                      onClick={() => {
                        setEditingDayLabel(activeDay);
                        setDayLabelValue(getCurrentDayLabel());
                      }}
                      className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
                      title="Renombrar día"
                      aria-label="Renombrar día"
                    >
                      <LuPencil className="w-4 h-4" />
                    </button>
                    {days.length > 1 && (
                      <button
                        onClick={() => removeDay(activeDay)}
                        className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 flex items-center justify-center transition-colors"
                        title="Eliminar este día"
                        aria-label="Eliminar este día"
                      >
                        <LuTrash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}

                {/* Day Telemetry & Badges */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0">
                  {muscleGroups.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {muscleGroups.map((mg) => (
                        <span
                          key={mg}
                          className="bg-lime-400/10 text-lime-400 text-[10px] sm:text-[11px] font-bold px-2.5 py-1 rounded-lg uppercase border border-lime-400/20"
                        >
                          {mg}
                        </span>
                      ))}
                    </div>
                  )}
                  {exercises.length > 0 && (
                    <span className="text-xs text-zinc-400 font-semibold flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.06] px-3 py-1 rounded-lg">
                      <LuTimer className="w-3.5 h-3.5 text-cyan-400" />
                      <span>~{formatDuration(duration)}</span>
                    </span>
                  )}
                  <span className="text-xs text-zinc-400 font-semibold bg-white/[0.03] border border-white/[0.06] px-3 py-1 rounded-lg">
                    {exercises.length} {exercises.length === 1 ? 'ejercicio' : 'ejercicios'}
                  </span>
                </div>
              </div>

              {/* Integrated Dominant Action Button */}
              {/* Rest times set up before starting */}
              {exercises.length > 0 && (
                <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => setShowRestSetup((v) => !v)}
                    aria-expanded={showRestSetup}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
                  >
                    <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-300">
                      <LuTimer className="w-4 h-4 text-lime-400" />
                      Descansos
                    </span>
                    <span className="flex items-center gap-2 text-xs font-mono font-bold">
                      <span className="text-lime-400">{fmtPreset(restDefaults.betweenSets)}</span>
                      <span className="text-zinc-600">/</span>
                      <span className="text-cyan-400">{fmtPreset(restDefaults.betweenExercises)}</span>
                      <LuChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${showRestSetup ? 'rotate-180' : ''}`} />
                    </span>
                  </button>
                  {showRestSetup && (
                    <div className="px-3 pb-3 space-y-2 animate-fadeIn">
                      <RestConfigPanel value={restDefaults} onChange={setRestDefaults} />
                      <p className="text-[11px] text-zinc-500 px-1">
                        Se usarán al iniciar y quedan guardados como tus predeterminados. Podrás ajustarlos durante el entreno.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {exercises.length > 0 && (
                <button
                  onClick={startDay}
                  className="w-full h-[52px] min-h-[52px] bg-lime-400 hover:bg-lime-300 text-slate-950 font-black text-sm uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2.5 transition-all duration-150 shadow-[0_8px_25px_rgba(204,255,0,0.25)] hover:shadow-[0_12px_32px_rgba(204,255,0,0.35)] active:scale-[0.98]"
                >
                  <LuPlay className="w-5 h-5 fill-black stroke-black" />
                  <span>INICIAR ENTRENAMIENTO</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── 4. Exercises List Section ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <LuDumbbell className="w-4 h-4 text-lime-400" />
              <span>Ejercicios del día</span>
              {exercises.length > 0 && (
                <span className="text-[11px] font-bold text-lime-400 bg-lime-400/10 px-2.5 py-0.5 rounded-full border border-lime-400/20">
                  {exercises.length}
                </span>
              )}
            </h2>
            <button
              onClick={() => {
                setShowPicker(!showPicker);
                if (!showPicker) setTimeout(() => pickerRef.current?.focus(), 100);
              }}
              className="border border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-lime-400/40 hover:text-lime-400 transition-all font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 active:scale-95"
            >
              {showPicker ? (
                <>
                  <LuX className="w-3.5 h-3.5" />
                  <span>Cerrar catálogo</span>
                </>
              ) : (
                <>
                  <LuPlus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Agregar ejercicio</span>
                </>
              )}
            </button>
          </div>

          {/* Exercise Catalog Picker: search on the server, pictures to recognise each exercise, preview before adding */}
          {showPicker && (
            <ExercisePickerPanel
              inputRef={pickerRef}
              addedIds={new Set(exercises.map((e) => e.exercise?._id || e.exercise))}
              onAdd={addExercise}
            />
          )}

          {/* Empty State for Day */}
          {exercises.length === 0 && !showPicker && (
            <div className="text-center py-12 bg-[#0E1018]/60 border border-dashed border-white/10 rounded-3xl space-y-3 px-4">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto text-zinc-400">
                <LuClipboardList className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-zinc-300">
                No hay ejercicios configurados en {getCurrentDayLabel()}
              </h3>
              <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                Selecciona ejercicios del catálogo para estructurar las series y cargas de este día.
              </p>
              <button
                onClick={() => {
                  setShowPicker(true);
                  setTimeout(() => pickerRef.current?.focus(), 100);
                }}
                className="mt-2 border border-zinc-700 bg-zinc-900 text-lime-400 hover:border-lime-400/40 px-5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 inline-flex items-center gap-1.5"
              >
                <LuPlus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Agregar primer ejercicio</span>
              </button>
            </div>
          )}

          {/* Ergonomic Exercise Cards List */}
          <div ref={listRef} className="space-y-3 relative">
            {exercises.map((ex, idx) => {
              const isExpanded = expandedIdx === idx;
              const isDragging = dragState?.idx === idx;
              const totalVolume =
                ex.weight > 0
                  ? `${ex.sets * ex.repsMin * ex.weight}–${ex.sets * ex.repsMax * ex.weight} kg`
                  : null;

              let transform = 'none';
              if (dragState && !isDragging && orderedIdxs) {
                const visualPos = orderedIdxs.indexOf(idx);
                const shift = (visualPos - idx) * dragState.itemHeight;
                transform = `translateY(${shift}px)`;
              }
              const dragTransform = isDragging
                ? `translateY(${dragState.currentY - dragState.startY}px)`
                : undefined;

              return (
                <div
                  key={`${ex.exercise?._id || idx}-${idx}`}
                  ref={(el) => (itemRefs.current[idx] = el)}
                  style={{
                    transform: isDragging ? dragTransform : transform,
                    transition: isDragging ? 'none' : 'transform 200ms ease',
                    zIndex: isDragging ? 50 : 1,
                    position: 'relative',
                  }}
                >
                  <div
                    className={`rounded-2xl overflow-hidden transition-all duration-200 ${
                      isDragging
                        ? 'border border-lime-400 shadow-2xl shadow-lime-400/20 scale-[1.01] bg-zinc-900'
                        : isExpanded
                        ? 'border border-lime-400/40 bg-zinc-900/90 shadow-xl'
                        : 'border border-white/5 bg-zinc-900/60 hover:border-lime-400/30 hover:bg-zinc-900/90'
                    }`}
                  >
                    {/* Collapsed Row Header (Entire row is clickable) */}
                    <div
                      className="flex items-center justify-between p-3.5 rounded-2xl cursor-pointer select-none transition-all duration-200 gap-3"
                      onClick={() => !dragState && setExpandedIdx(isExpanded ? null : idx)}
                    >
                      {/* Bloque Izquierdo (Orden + Datos del ejercicio) */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Número de orden / drag-handle en cápsula estilizada */}
                        <div
                          className="w-9 h-9 rounded-xl bg-zinc-800/80 border border-white/10 hover:border-lime-400/40 hover:text-lime-400 flex items-center justify-center font-bold text-sm text-zinc-200 shrink-0 cursor-grab active:cursor-grabbing transition-colors touch-none"
                          title="Arrastra para reordenar"
                          onPointerDown={(e) => onPointerDown(e, idx)}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="font-mono font-bold text-xs">{idx + 1}</span>
                        </div>

                        {/* Información del ejercicio */}
                        <div className="min-w-0 flex-1">
                          {/* Fila superior: Nombre del ejercicio + Badge muscular */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-sm sm:text-base font-extrabold text-white tracking-tight truncate ${
                                !ex.exercise?.name ? 'text-rose-400 italic' : ''
                              }`}
                            >
                              {ex.exercise?.name || (
                                <>
                                  <LuTriangleAlert className="inline w-4 h-4 mr-1 text-rose-400" />
                                  Ejercicio eliminado
                                </>
                              )}
                            </span>
                            {ex.exercise?.muscleGroup && (
                              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 border border-white/5 shrink-0">
                                {ex.exercise?.muscleGroup}
                              </span>
                            )}
                          </div>

                          {/* Fila inferior: Mini-badges con alto contraste */}
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
                            <span className="font-semibold text-white">
                              {ex.sets} {ex.sets === 1 ? 'serie' : 'series'}
                            </span>
                            <span className="text-zinc-600 font-bold">·</span>
                            <span className="text-zinc-300 font-medium">
                              {ex.repsMin === ex.repsMax ? `${ex.repsMin}` : `${ex.repsMin}–${ex.repsMax}`} reps
                            </span>
                            {ex.weight > 0 && (
                              <>
                                <span className="text-zinc-600 font-bold">·</span>
                                <span className="text-lime-400 font-bold">
                                  {ex.weight} kg
                                </span>
                              </>
                            )}
                            {/* 0 = no own rest (the workout uses the user's default), like weight 0 */}
                            {ex.restSeconds > 0 && (
                              <>
                                <span className="text-zinc-600 font-bold">·</span>
                                <span className="text-cyan-400 font-medium flex items-center gap-1">
                                  <LuTimer className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                  <span>{ex.restSeconds}s</span>
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Bloque Derecho (Acciones y Chevron) */}
                      <div
                        className="flex items-center gap-1 shrink-0 ml-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Botones de mover minimalistas y discretos */}
                        <button
                          type="button"
                          onClick={() => moveExercise(idx, -1)}
                          disabled={idx === 0}
                          className="p-2 text-zinc-500 hover:text-white rounded-lg hover:bg-zinc-800/60 disabled:opacity-20 transition-colors active:scale-90"
                          title="Mover arriba"
                          aria-label="Mover arriba"
                        >
                          <span className="text-xs">▲</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => moveExercise(idx, 1)}
                          disabled={idx === exercises.length - 1}
                          className="p-2 text-zinc-500 hover:text-white rounded-lg hover:bg-zinc-800/60 disabled:opacity-20 transition-colors active:scale-90"
                          title="Mover abajo"
                          aria-label="Mover abajo"
                        >
                          <span className="text-xs">▼</span>
                        </button>

                        {/* Indicador de acordeón: Chevron animado */}
                        <div
                          className="p-1.5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedIdx(isExpanded ? null : idx);
                          }}
                        >
                          <LuChevronDown
                            className={`w-5 h-5 text-zinc-400 transition-transform duration-200 ${
                              isExpanded ? 'rotate-180 text-lime-400' : ''
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Expanded Inline Configuration Panel */}
                    {isExpanded && (
                      <div className="border-t border-white/[0.06] p-4 sm:p-5 space-y-4 bg-[#11131E]/70 animate-fadeIn">
                        {/* Unified 3-Card Metrics Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {/* 1. Series Card */}
                          <div className="bg-[#131622] border border-white/[0.08] rounded-2xl p-3.5 flex flex-col items-center justify-between">
                            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-zinc-400 mb-2">
                              Series
                            </span>
                            <div className="flex items-center justify-between w-full">
                              <button
                                type="button"
                                onClick={() => updateField(idx, 'sets', Math.max(1, (ex.sets || 3) - 1))}
                                disabled={ex.sets <= 1}
                                className="w-10 h-10 min-w-[38px] min-h-[38px] rounded-xl bg-white/[0.05] hover:bg-white/10 active:scale-90 text-zinc-200 hover:text-white font-black text-lg flex items-center justify-center transition-all border border-white/[0.06] disabled:opacity-20"
                                title="Restar serie"
                              >
                                -
                              </button>
                              <div className="text-center">
                                <input
                                  type="number"
                                  min="1"
                                  max="20"
                                  value={ex.sets}
                                  onChange={(e) => updateField(idx, 'sets', Math.max(1, +e.target.value || 1))}
                                  className="w-14 text-center text-xl sm:text-2xl font-black text-white bg-transparent outline-none focus:ring-1 focus:ring-lime-400/40 rounded-md"
                                />
                                <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                                  series
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => updateField(idx, 'sets', Math.min(20, (ex.sets || 3) + 1))}
                                disabled={ex.sets >= 20}
                                className="w-10 h-10 min-w-[38px] min-h-[38px] rounded-xl bg-white/[0.05] hover:bg-lime-400/20 active:scale-90 text-zinc-200 hover:text-lime-400 font-black text-lg flex items-center justify-center transition-all border border-white/[0.06] disabled:opacity-20"
                                title="Sumar serie"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* 2. Simplified Target Reps Card */}
                          <div className="bg-[#131622] border border-white/[0.08] rounded-2xl p-3.5 flex flex-col items-center justify-between">
                            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-zinc-400 mb-2">
                              Rango Reps
                            </span>

                            <div className="text-center my-0.5">
                              <div className="flex items-baseline justify-center">
                                <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
                                  {ex.repsMin === ex.repsMax ? ex.repsMin : `${ex.repsMin} – ${ex.repsMax}`}
                                </span>
                                <span className="text-xs font-bold text-zinc-400 ml-1">reps</span>
                              </div>
                              <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                                {ex.repsMin === ex.repsMax ? 'reps fijas' : 'rango objetivo'}
                              </span>
                            </div>

                            {/* Clean Steppers for Min and Max */}
                            <div className="grid grid-cols-2 gap-2 w-full pt-2 border-t border-white/[0.06]">
                              <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.04] rounded-xl px-2 py-1">
                                <span className="text-[9px] font-black text-zinc-500 uppercase">Mín</span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => updateField(idx, 'repsMin', Math.max(1, (ex.repsMin || 8) - 1))}
                                    disabled={ex.repsMin <= 1}
                                    className="w-6 h-6 rounded-md bg-white/[0.06] hover:bg-white/10 active:scale-90 text-xs font-bold text-zinc-300 flex items-center justify-center disabled:opacity-20 transition-all"
                                    title="Restar rep mín"
                                  >
                                    -
                                  </button>
                                  <span className="text-xs font-black text-white w-6 text-center">{ex.repsMin}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nextMin = (ex.repsMin || 8) + 1;
                                      updateField(idx, 'repsMin', nextMin);
                                      if (nextMin > ex.repsMax) updateField(idx, 'repsMax', nextMin);
                                    }}
                                    disabled={ex.repsMin >= 100}
                                    className="w-6 h-6 rounded-md bg-white/[0.06] hover:bg-white/10 active:scale-90 text-xs font-bold text-zinc-300 flex items-center justify-center disabled:opacity-20 transition-all"
                                    title="Sumar rep mín"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>

                              <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.04] rounded-xl px-2 py-1">
                                <span className="text-[9px] font-black text-zinc-500 uppercase">Máx</span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nextMax = Math.max(1, (ex.repsMax || 12) - 1);
                                      updateField(idx, 'repsMax', nextMax);
                                      if (nextMax < ex.repsMin) updateField(idx, 'repsMin', nextMax);
                                    }}
                                    disabled={ex.repsMax <= 1}
                                    className="w-6 h-6 rounded-md bg-white/[0.06] hover:bg-white/10 active:scale-90 text-xs font-bold text-zinc-300 flex items-center justify-center disabled:opacity-20 transition-all"
                                    title="Restar rep máx"
                                  >
                                    -
                                  </button>
                                  <span className="text-xs font-black text-white w-6 text-center">{ex.repsMax}</span>
                                  <button
                                    type="button"
                                    onClick={() => updateField(idx, 'repsMax', (ex.repsMax || 12) + 1)}
                                    disabled={ex.repsMax >= 100}
                                    className="w-6 h-6 rounded-md bg-white/[0.06] hover:bg-white/10 active:scale-90 text-xs font-bold text-zinc-300 flex items-center justify-center disabled:opacity-20 transition-all"
                                    title="Sumar rep máx"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* 3. Weight Card */}
                          <div className="bg-[#131622] border border-white/[0.08] rounded-2xl p-3.5 flex flex-col items-center justify-between">
                            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-zinc-400 mb-2">
                              Peso Sugerido
                            </span>
                            <div className="flex items-center justify-between w-full">
                              <button
                                type="button"
                                onClick={() =>
                                  updateField(
                                    idx,
                                    'weight',
                                    Math.max(0, Math.round(((ex.weight || 0) - 2.5) * 10) / 10)
                                  )
                                }
                                disabled={(ex.weight || 0) <= 0}
                                className="w-10 h-10 min-w-[38px] min-h-[38px] rounded-xl bg-white/[0.05] hover:bg-white/10 active:scale-90 text-zinc-200 hover:text-white font-black text-lg flex items-center justify-center transition-all border border-white/[0.06] disabled:opacity-20"
                                title="Restar 2.5 kg"
                              >
                                -
                              </button>
                              <div className="text-center">
                                <div className="flex items-baseline justify-center">
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={ex.weight || 0}
                                    onChange={(e) => updateField(idx, 'weight', Math.max(0, +e.target.value || 0))}
                                    className="w-16 text-center text-xl sm:text-2xl font-black text-lime-400 bg-transparent outline-none focus:ring-1 focus:ring-lime-400/40 rounded-md"
                                  />
                                  <span className="text-xs font-bold text-lime-400/80 ml-0.5">kg</span>
                                </div>
                                <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                                  por serie
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  updateField(
                                    idx,
                                    'weight',
                                    Math.round(((ex.weight || 0) + 2.5) * 10) / 10
                                  )
                                }
                                className="w-10 h-10 min-w-[38px] min-h-[38px] rounded-xl bg-white/[0.05] hover:bg-lime-400/20 active:scale-90 text-zinc-200 hover:text-lime-400 font-black text-lg flex items-center justify-center transition-all border border-white/[0.06]"
                                title="Sumar 2.5 kg"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Tactical Rest Time Selector (No Lag, Instant 60fps Response) */}
                        <div className="bg-[#131622] border border-white/[0.08] rounded-2xl p-4 space-y-3">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                              <LuTimer className="w-4 h-4 text-cyan-400" />
                              <span>Descanso entre series</span>
                            </span>

                            <div className="flex items-baseline gap-1.5">
                              <span className="text-lime-400 font-black text-base sm:text-lg">{ex.restSeconds}s</span>
                              {ex.restSeconds >= 60 && (
                                <span className="text-xs text-zinc-400 font-medium">
                                  ({Math.floor(ex.restSeconds / 60)}m{ex.restSeconds % 60 > 0 ? ` ${ex.restSeconds % 60}s` : ''})
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Quick Preset Chips & Steppers */}
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Micro-stepper -15s */}
                            <button
                              type="button"
                              onClick={() => updateField(idx, 'restSeconds', Math.max(15, (ex.restSeconds || 90) - 15))}
                              disabled={(ex.restSeconds || 90) <= 15}
                              className="px-2.5 py-1.5 rounded-xl text-xs font-black bg-white/[0.04] text-zinc-300 hover:text-white border border-white/[0.06] hover:border-white/20 active:scale-95 disabled:opacity-20 transition-all"
                              title="Restar 15 segundos"
                            >
                              -15s
                            </button>

                            {REST_PRESETS.map((p) => {
                              const isSelected = ex.restSeconds === p.value;
                              return (
                                <button
                                  key={p.value}
                                  type="button"
                                  onClick={() => updateField(idx, 'restSeconds', p.value)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border active:scale-95 ${
                                    isSelected
                                      ? 'bg-lime-400 text-slate-950 font-black border-lime-400 shadow-md shadow-lime-400/20'
                                      : 'bg-white/[0.04] text-zinc-300 hover:text-white border-white/[0.06] hover:border-white/20'
                                  }`}
                                >
                                  {p.label}
                                </button>
                              );
                            })}

                            {/* Micro-stepper +15s */}
                            <button
                              type="button"
                              onClick={() => updateField(idx, 'restSeconds', Math.min(600, (ex.restSeconds || 90) + 15))}
                              disabled={(ex.restSeconds || 90) >= 600}
                              className="px-2.5 py-1.5 rounded-xl text-xs font-black bg-white/[0.04] text-zinc-300 hover:text-white border border-white/[0.06] hover:border-white/20 active:scale-95 disabled:opacity-20 transition-all"
                              title="Sumar 15 segundos"
                            >
                              +15s
                            </button>
                          </div>
                        </div>

                        {/* Volume Preview */}
                        {totalVolume && (
                          <p className="text-xs text-zinc-400 font-medium flex items-center gap-1.5 bg-[#131622] p-3 rounded-xl border border-white/[0.06]">
                            <LuChartBar className="w-4 h-4 text-cyan-400 shrink-0" />
                            <span>Volumen proyectado por ejercicio:</span>
                            <span className="text-white font-bold">{totalVolume}</span>
                          </p>
                        )}

                        {/* Exercise Catalog Link & Safe Delete Button */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1 border-t border-white/[0.06]">
                          {ex.exercise?._id ? (
                            <Link
                              to={`/exercises/${ex.exercise._id}`}
                              className="inline-flex items-center justify-between gap-3 bg-[#131622] hover:bg-zinc-800/90 border border-white/10 hover:border-lime-400/40 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-200 transition-all group active:scale-[0.99]"
                            >
                              <span className="flex items-center gap-2">
                                <LuDumbbell className="w-4 h-4 text-lime-400" />
                                <span>Ver técnica y detalles del ejercicio</span>
                              </span>
                              <LuArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-lime-400 group-hover:translate-x-0.5 transition-all" />
                            </Link>
                          ) : (
                            <span className="text-rose-400 text-xs flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-xl">
                              <LuTriangleAlert className="w-4 h-4 shrink-0" />
                              <span>Ejercicio no encontrado en catálogo</span>
                            </span>
                          )}

                          {/* Isolated Safe Delete Button */}
                          <button
                            type="button"
                            onClick={() => removeExercise(idx)}
                            className="py-2.5 px-4 rounded-xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                          >
                            <LuTrash2 className="w-4 h-4" />
                            <span>Eliminar ejercicio</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary Footer */}
          {exercises.length > 0 && (
            <div className="bg-[#0E1018] border border-white/[0.08] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-zinc-400">
              <span>
                {getCurrentDayLabel()}:{' '}
                <span className="text-white font-black">{exercises.length}</span> ejercicios
              </span>
              <span>
                Series totales:{' '}
                <span className="text-lime-400 font-black">
                  {exercises.reduce((s, e) => s + (e.sets || 0), 0)}
                </span>
              </span>
              <span>
                Duración estimada:{' '}
                <span className="text-cyan-400 font-black">{formatDuration(duration)}</span>
              </span>
            </div>
          )}
        </div>

      </div>

      {/* ── 6. Fixed Saving Floating Pill ── */}
      {saving && (
        <div className="fixed bottom-6 right-6 bg-[#0E1018]/95 backdrop-blur-md border border-lime-400/40 text-lime-400 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider shadow-2xl flex items-center gap-2 z-50">
          <LuSave className="w-4 h-4 animate-pulse" />
          <span>Guardando cambios…</span>
        </div>
      )}
    </div>
  );
}
