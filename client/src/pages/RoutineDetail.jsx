import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import ConfirmDialog from '../components/ConfirmDialog';
import { LuActivity, LuDumbbell, LuFlame, LuHeart, LuSparkles, LuZap, LuPencil, LuTrash2, LuCalendar, LuClipboardList, LuTimer, LuTriangleAlert, LuPlay, LuChartBar, LuSave } from 'react-icons/lu';

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

const EMPTY_CONFIRM = {
    open: false,
    title: '',
    message: '',
    tone: 'warning',
    confirmLabel: 'Confirmar',
    action: null,
};

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
    const [catalog, setCatalog] = useState([]);
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ name: '', description: '', goal: 'general' });
    const [showPicker, setShowPicker] = useState(false);
    const [pickerSearch, setPickerSearch] = useState('');
    const [pickerFilter, setPickerFilter] = useState('all');
    const [expandedIdx, setExpandedIdx] = useState(null);
    const [saving, setSaving] = useState(false);
    const [activeDay, setActiveDay] = useState(0);
    const [editingDayLabel, setEditingDayLabel] = useState(null);
    const [dayLabelValue, setDayLabelValue] = useState('');
    const [showAddDay, setShowAddDay] = useState(false);
    const [confirmState, setConfirmState] = useState(EMPTY_CONFIRM);

    // — Custom drag & drop state —
    const [dragState, setDragState] = useState(null); // { idx, startY, currentY, itemHeight }
    const [orderedIdxs, setOrderedIdxs] = useState(null); // visual order during drag
    const currentYRef = useRef(0); // ref to avoid stale closure in onUp
    const listRef = useRef(null);
    const itemRefs = useRef([]);

    const pickerRef = useRef(null);

    const openConfirm = (title, message, tone, confirmLabel, action) => {
        setConfirmState({
            open: true,
            title,
            message,
            tone,
            confirmLabel,
            action,
        });
    };

    const closeConfirm = () => setConfirmState(EMPTY_CONFIRM);

    const load = async () => {
        const { data } = await api.get(`/routines/${id}`);
        setRoutine(data);
        setForm({ name: data.name, description: data.description || '', goal: data.goal });
        // Ensure activeDay stays valid
        const dayCount = data.days?.length || 0;
        setActiveDay((prev) => (prev >= dayCount && dayCount > 0 ? dayCount - 1 : prev));
    };

    useEffect(() => {
        load();
        api.get('/exercises').then((r) => setCatalog(r.data));
    }, [id]);

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
            await api.put(`/routines/${id}`, { days: newDays.map((d) => ({ dayLabel: d.dayLabel, exercises: serializeExercises(d.exercises || []) })) });
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
        setSaving(true);
        try {
            const newDays = getDays().filter((_, i) => i !== dayIdx);
            await api.put(`/routines/${id}`, { days: newDays.map((d) => ({ dayLabel: d.dayLabel, exercises: serializeExercises(d.exercises || []) })) });
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

    // — Exercise operations (save to current day) —
    const persistExercises = async (updated) => {
        setSaving(true);
        try {
            const newDays = getDays().map((d, i) => ({
                dayLabel: d.dayLabel,
                exercises: i === activeDay ? serializeExercises(updated) : serializeExercises(d.exercises || []),
            }));
            await api.put(`/routines/${id}`, { days: newDays });
            await load();
        } catch (err) {
            toast.error('Error al guardar: ' + (err.response?.data?.message || err.message));
        } finally {
            setSaving(false);
        }
    };

    const addExercise = async (exerciseId) => {
        const existing = getCurrentDayExercises();
        if (existing.some((e) => (e.exercise?._id || e.exercise) === exerciseId)) {
            toast.error('Este ejercicio ya está en este día');
            return;
        }
        const updated = [
            ...existing,
            {
                exercise: exerciseId,
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

    // — Custom drag & drop —
    const getTargetIdx = useCallback((originalIdx, deltaY, itemHeight, total) => {
        const shift = Math.round(deltaY / itemHeight);
        const target = Math.max(0, Math.min(total - 1, originalIdx + shift));
        return target;
    }, []);

    const onPointerDown = useCallback((e, idx) => {
        // Only start drag from the handle
        if (e.button !== 0) return;
        e.preventDefault();
        const el = itemRefs.current[idx];
        if (!el) return;
        const rect = el.getBoundingClientRect();
        // Collapse expanded panels during drag
        setExpandedIdx(null);
        currentYRef.current = e.clientY;
        setDragState({ idx, startY: e.clientY, currentY: e.clientY, itemHeight: rect.height + 12 }); // 12 = gap
        setOrderedIdxs(null);
    }, []);

    useEffect(() => {
        if (!dragState) return;
        const { idx, startY, itemHeight } = dragState;
        const total = getCurrentDayExercises().length;

        const onMove = (e) => {
            const currentY = e.clientY;
            currentYRef.current = currentY;
            setDragState((prev) => prev ? { ...prev, currentY } : null);
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
            sets: Array.from({ length: e.sets }, (_, si) => ({
                setNumber: si + 1,
                reps: e.repsMin,
                weight: e.weight || 0,
            })),
        }));
        navigate('/workouts', { state: { preloaded, routineName: `${routine.name} — ${getCurrentDayLabel()}` } });
    };

    // — Delete routine —
    const handleDeleteRoutine = async () => {
        await api.delete(`/routines/${id}`);
        toast.success('Rutina eliminada');
        navigate('/routines');
    };

    if (!routine) {
        return (
            <div className="max-w-4xl mx-auto p-4">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-slate-700 rounded w-48" />
                    <div className="h-4 bg-slate-700 rounded w-32" />
                    <div className="h-32 bg-slate-800 rounded-2xl" />
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
    const allMuscleGroups = [...new Set(days.flatMap((d) => (d.exercises || []).map((e) => e.exercise?.muscleGroup).filter(Boolean)))];

    const filteredCatalog = catalog.filter((ex) => {
        const matchSearch =
            ex.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
            ex.muscleGroup.toLowerCase().includes(pickerSearch.toLowerCase());
        const matchFilter = pickerFilter === 'all' || ex.muscleGroup === pickerFilter;
        return matchSearch && matchFilter;
    });
    const catalogMuscles = [...new Set(catalog.map((e) => e.muscleGroup))];

    return (
        <div className="max-w-4xl mx-auto p-4 space-y-6 pb-24">
            {/* Back link */}
            <Link to="/routines" className="text-primary text-sm hover:underline inline-flex items-center gap-1">
                ← Volver a rutinas
            </Link>

            {/* ─── Header / Info ─── */}
            {editing ? (
                <div className="bg-slate-800 border border-slate-700 p-5 rounded-2xl space-y-4">
                    <h2 className="font-semibold text-lg">Editar rutina</h2>
                    <input
                        className="w-full bg-slate-700 rounded-lg px-4 py-2.5 outline-none text-lg font-semibold focus:ring-2 focus:ring-primary"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                    <textarea
                        placeholder="Descripción (opcional)"
                        rows={2}
                        className="w-full bg-slate-700 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary resize-none"
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                    <div className="flex flex-wrap gap-3">
                        <div className="flex-1 min-w-[140px]">
                            <label className="text-xs text-gray-400 mb-1 block">Objetivo</label>
                            <select
                                className="w-full bg-slate-700 rounded-lg px-3 py-2"
                                value={form.goal}
                                onChange={(e) => setForm({ ...form, goal: e.target.value })}
                            >
                                {GOALS.map((g) => (
                                    <option key={g.v} value={g.v}>{g.l}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={saveInfo}
                            disabled={saving}
                            className="bg-primary hover:bg-indigo-600 px-5 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
                        >
                            {saving ? 'Guardando…' : 'Guardar cambios'}
                        </button>
                        <button
                            onClick={() => setEditing(false)}
                            className="bg-slate-600 hover:bg-slate-500 px-4 py-2 rounded-lg text-sm transition"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            ) : (
                <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <h1 className="text-2xl font-bold">{routine.name}</h1>
                            {routine.description && (
                                <p className="text-gray-400 mt-1">{routine.description}</p>
                            )}
                        </div>
                        <div className="flex gap-2 shrink-0">
                            <button
                                onClick={() => setEditing(true)}
                                className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-lg text-sm transition"
                                title="Editar información"
                            >
                                <LuPencil className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => openConfirm('Eliminar rutina', 'La rutina completa se eliminara de forma permanente.', 'danger', 'Eliminar', handleDeleteRoutine)}
                                className="bg-slate-700 hover:bg-red-600 px-3 py-2 rounded-lg text-sm transition"
                                title="Eliminar rutina"
                            >
                                <LuTrash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Stats bar */}
                    <div className="flex flex-wrap gap-3 mt-4">
                        <span className="bg-slate-700 text-sm px-3 py-1 rounded-full flex items-center gap-1.5">
                            <LuCalendar className="w-4 h-4" /> {days.length} {days.length === 1 ? 'día' : 'días'}
                        </span>
                        <span className="bg-slate-700 text-sm px-3 py-1 rounded-full flex items-center gap-1.5">
                            <goal.Icon className="w-4 h-4" /> {goal.l}
                        </span>
                        <span className="bg-slate-700 text-sm px-3 py-1 rounded-full flex items-center gap-1.5">
                            <LuClipboardList className="w-4 h-4" /> {totalExercises} ejercicios en total
                        </span>
                    </div>

                    {/* Muscle groups */}
                    {allMuscleGroups.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                            {allMuscleGroups.map((mg) => (
                                <span key={mg} className="bg-primary/10 text-primary text-xs px-2.5 py-0.5 rounded-full capitalize">
                                    {mg}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ─── Day Tabs ─── */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Días de entrenamiento</h2>
                    <button
                        onClick={() => setShowAddDay(!showAddDay)}
                        className="bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                    >
                        {showAddDay ? '✕ Cerrar' : '+ Agregar día'}
                    </button>
                </div>

                {showAddDay && (
                    <div className="flex flex-wrap gap-1.5 bg-slate-800/50 border border-slate-700 rounded-xl p-3">
                        {WEEKDAYS.filter((wd) => !getDays().some((d) => d.dayLabel === wd.full)).map((wd) => (
                            <button
                                key={wd.v}
                                onClick={() => addDay(wd.full)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-700 border border-slate-600 text-gray-300 hover:border-primary hover:text-white transition"
                            >
                                {wd.full}
                            </button>
                        ))}
                        {getDays().length >= 7 && <p className="text-xs text-gray-500">Ya tienes todos los días</p>}
                    </div>
                )}

                <div className="flex gap-2 overflow-x-auto pb-1">
                    {days.map((day, i) => (
                        <button
                            key={day._id || i}
                            onClick={() => { setActiveDay(i); setExpandedIdx(null); }}
                            className={`relative px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all shrink-0 border ${activeDay === i
                                ? 'bg-primary/20 border-primary text-white shadow-lg shadow-primary/10'
                                : 'bg-slate-800 border-slate-700 text-gray-400 hover:border-slate-500 hover:text-gray-200'
                                }`}
                        >
                            <span className="flex items-center gap-2">
                                <span className="text-xs opacity-70">{i + 1}</span>
                                {day.dayLabel || `Día ${i + 1}`}
                                <span className="text-[10px] text-gray-500">
                                    ({day.exercises?.length || 0})
                                </span>
                            </span>
                        </button>
                    ))}
                </div>

                {/* Current Day Header */}
                {days.length > 0 && (
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-center justify-between flex-wrap gap-2">
                        {editingDayLabel === activeDay ? (
                            <div className="flex items-center gap-2 flex-1">
                                <input
                                    className="bg-slate-700 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary flex-1"
                                    value={dayLabelValue}
                                    onChange={(e) => setDayLabelValue(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && saveDayLabel(activeDay)}
                                    autoFocus
                                />
                                <button onClick={() => saveDayLabel(activeDay)} className="text-green-400 hover:text-green-300 text-sm">✓</button>
                                <button onClick={() => setEditingDayLabel(null)} className="text-gray-400 hover:text-gray-300 text-sm">✕</button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-lg">{getCurrentDayLabel()}</h3>
                                <button
                                    onClick={() => { setEditingDayLabel(activeDay); setDayLabelValue(getCurrentDayLabel()); }}
                                    className="text-gray-500 hover:text-gray-300 text-xs transition"
                                    title="Renombrar día"
                                >
                                    <LuPencil className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}
                        <div className="flex items-center gap-2 shrink-0">
                            {muscleGroups.length > 0 && (
                                <div className="flex gap-1">
                                    {muscleGroups.map((mg) => (
                                        <span key={mg} className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full capitalize">{mg}</span>
                                    ))}
                                </div>
                            )}
                            {exercises.length > 0 && (
                                <span className="text-xs text-gray-400 flex items-center gap-1"><LuTimer className="w-3.5 h-3.5" /> ~{formatDuration(duration)}</span>
                            )}
                            {days.length > 1 && (
                                <button
                                    onClick={() => openConfirm('Eliminar dia', `Se eliminara ${getCurrentDayLabel()} y todos sus ejercicios.`, 'danger', 'Eliminar', () => removeDay(activeDay))}
                                    className="text-gray-500 hover:text-red-400 text-xs ml-1 transition"
                                    title="Eliminar este día"
                                >
                                    <LuTrash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ─── Start Day Button ─── */}
            {exercises.length > 0 && (
                <button
                    onClick={startDay}
                    className="w-full bg-green-600 hover:bg-green-700 py-3 rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2"
                >
                    <LuPlay className="w-5 h-5" /> Iniciar {getCurrentDayLabel()}
                </button>
            )}

            {/* ─── Exercise Editor ─── */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">
                        Ejercicios — {getCurrentDayLabel()}
                        {exercises.length > 0 && (
                            <span className="text-sm text-gray-400 font-normal ml-2">
                                ({exercises.length})
                            </span>
                        )}
                    </h2>
                    <button
                        onClick={() => {
                            setShowPicker(!showPicker);
                            setPickerSearch('');
                            setPickerFilter('all');
                            if (!showPicker) setTimeout(() => pickerRef.current?.focus(), 100);
                        }}
                        className="bg-primary hover:bg-indigo-600 px-4 py-2 rounded-lg text-sm font-semibold transition"
                    >
                        {showPicker ? '✕ Cerrar' : '+ Agregar ejercicio'}
                    </button>
                </div>

                {/* ─── Exercise Picker ─── */}
                {showPicker && (
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 space-y-3">
                        <input
                            ref={pickerRef}
                            placeholder="Buscar por nombre o grupo muscular…"
                            className="w-full bg-slate-700 rounded-lg px-4 py-2.5 outline-none text-sm focus:ring-2 focus:ring-primary"
                            value={pickerSearch}
                            onChange={(e) => setPickerSearch(e.target.value)}
                        />
                        {/* Muscle group filter chips */}
                        <div className="flex flex-wrap gap-1.5">
                            <button
                                onClick={() => setPickerFilter('all')}
                                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition ${pickerFilter === 'all'
                                    ? 'bg-primary text-white'
                                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                                    }`}
                            >
                                Todos
                            </button>
                            {catalogMuscles.map((mg) => (
                                <button
                                    key={mg}
                                    onClick={() => setPickerFilter(mg)}
                                    className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize transition ${pickerFilter === mg
                                        ? 'bg-primary text-white'
                                        : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                                        }`}
                                >
                                    {mg}
                                </button>
                            ))}
                        </div>

                        <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                            {filteredCatalog.length === 0 ? (
                                <p className="text-gray-400 text-sm text-center py-4">No se encontraron ejercicios.</p>
                            ) : (
                                filteredCatalog.map((ex) => {
                                    const alreadyAdded = exercises.some(
                                        (e) => (e.exercise?._id || e.exercise) === ex._id
                                    );
                                    return (
                                        <button
                                            key={ex._id}
                                            onClick={() => !alreadyAdded && addExercise(ex._id)}
                                            disabled={alreadyAdded}
                                            className={`w-full text-left rounded-lg p-3 flex items-center justify-between transition ${alreadyAdded
                                                ? 'bg-slate-700/50 opacity-50 cursor-not-allowed'
                                                : 'bg-slate-700 hover:bg-slate-600'
                                                }`}
                                        >
                                            <div>
                                                <span className="font-semibold text-sm">{ex.name}</span>
                                                <span className="block text-xs text-gray-400 capitalize">
                                                    {ex.muscleGroup} · {ex.difficulty} · {ex.equipment}
                                                </span>
                                            </div>
                                            {alreadyAdded ? (
                                                <span className="text-xs text-gray-500">✓ Agregado</span>
                                            ) : (
                                                <span className="text-primary text-lg">+</span>
                                            )}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                {/* ─── Empty state ─── */}
                {exercises.length === 0 && !showPicker && (
                    <div className="text-center py-12 bg-slate-800/50 border-2 border-dashed border-slate-700 rounded-2xl">
                        <p className="text-4xl mb-2"><LuClipboardList className="w-10 h-10 mx-auto text-gray-400" /></p>
                        <p className="text-gray-400">No hay ejercicios en {getCurrentDayLabel()}</p>
                        <p className="text-gray-500 text-sm mt-1">Agrega ejercicios del catálogo para armar este día</p>
                        <button
                            onClick={() => { setShowPicker(true); setTimeout(() => pickerRef.current?.focus(), 100); }}
                            className="mt-4 bg-primary hover:bg-indigo-600 px-5 py-2 rounded-lg text-sm font-semibold transition"
                        >
                            + Agregar primer ejercicio
                        </button>
                    </div>
                )}

                {/* ─── Exercise list ─── */}
                <div ref={listRef} className="space-y-3 relative">
                    {exercises.map((ex, idx) => {
                        const isExpanded = expandedIdx === idx;
                        const isDragging = dragState?.idx === idx;
                        const totalVolume = ex.weight > 0
                            ? `${ex.sets * ex.repsMin * ex.weight}–${ex.sets * ex.repsMax * ex.weight} kg`
                            : null;

                        // Calculate visual transform for non-dragged items
                        let transform = 'none';
                        if (dragState && !isDragging && orderedIdxs) {
                            const visualPos = orderedIdxs.indexOf(idx);
                            const shift = (visualPos - idx) * (dragState.itemHeight);
                            transform = `translateY(${shift}px)`;
                        }
                        // Dragged item follows the pointer
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
                                    className={`bg-slate-800 border rounded-2xl overflow-hidden transition-shadow duration-200 ${isDragging
                                        ? 'border-primary shadow-2xl shadow-primary/20 scale-[1.02]'
                                        : 'border-slate-700 hover:border-slate-600'
                                        }`}
                                >
                                    {/* Collapsed header — always visible */}
                                    <div
                                        className="flex items-center gap-3 p-4 cursor-pointer select-none"
                                        onClick={() => !dragState && setExpandedIdx(isExpanded ? null : idx)}
                                    >
                                        {/* Drag handle + order */}
                                        <div
                                            className="flex flex-col items-center text-gray-500 hover:text-primary cursor-grab active:cursor-grabbing shrink-0 transition-colors px-1 touch-none"
                                            title="Arrastra para reordenar"
                                            onPointerDown={(e) => onPointerDown(e, idx)}
                                        >
                                            <span className="text-base leading-none">⠿</span>
                                            <span className="text-xs font-mono">{idx + 1}</span>
                                        </div>

                                        {/* Exercise info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className={`font-semibold truncate ${!ex.exercise?.name ? 'text-red-400 italic' : ''}`}>
                                                    {ex.exercise?.name || <><LuTriangleAlert className="inline w-4 h-4" /> Ejercicio eliminado</>}
                                                </span>
                                                <span className="text-xs text-gray-400 capitalize shrink-0">
                                                    {ex.exercise?.muscleGroup}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {ex.sets} series × {ex.repsMin}–{ex.repsMax} reps
                                                {ex.weight > 0 && ` · ${ex.weight} kg`}
                                                {` · ${ex.restSeconds}s descanso`}
                                            </p>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => moveExercise(idx, -1)}
                                                disabled={idx === 0}
                                                className="text-gray-400 hover:text-white disabled:opacity-20 text-sm p-1 transition"
                                                title="Mover arriba"
                                            >
                                                ▲
                                            </button>
                                            <button
                                                onClick={() => moveExercise(idx, 1)}
                                                disabled={idx === exercises.length - 1}
                                                className="text-gray-400 hover:text-white disabled:opacity-20 text-sm p-1 transition"
                                                title="Mover abajo"
                                            >
                                                ▼
                                            </button>
                                            <button
                                                onClick={() => removeExercise(idx)}
                                                className="text-gray-400 hover:text-red-400 text-sm p-1 ml-1 transition"
                                                title="Eliminar ejercicio"
                                            >
                                                ✕
                                            </button>
                                        </div>

                                        {/* Chevron */}
                                        <span className={`text-gray-400 text-sm transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                            ▾
                                        </span>
                                    </div>

                                    {/* Expanded config panel */}
                                    {isExpanded && (
                                        <div className="border-t border-slate-700 px-4 py-4 space-y-4 bg-slate-800/50">
                                            {/* Config inputs grid */}
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                <div>
                                                    <label className="text-xs text-gray-400 block mb-1">Series</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="20"
                                                        className="w-full bg-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-center"
                                                        value={ex.sets}
                                                        onChange={(e) => updateField(idx, 'sets', Math.max(1, +e.target.value || 1))}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-400 block mb-1">Reps mín</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="100"
                                                        className="w-full bg-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-center"
                                                        value={ex.repsMin}
                                                        onChange={(e) => updateField(idx, 'repsMin', Math.max(1, +e.target.value || 1))}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-400 block mb-1">Reps máx</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="100"
                                                        className="w-full bg-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-center"
                                                        value={ex.repsMax}
                                                        onChange={(e) => updateField(idx, 'repsMax', Math.max(1, +e.target.value || 1))}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-400 block mb-1">Peso (kg)</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.5"
                                                        className="w-full bg-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-center"
                                                        value={ex.weight || 0}
                                                        onChange={(e) => updateField(idx, 'weight', Math.max(0, +e.target.value || 0))}
                                                    />
                                                </div>
                                            </div>

                                            {/* Rest time slider */}
                                            <div>
                                                <label className="text-xs text-gray-400 block mb-1">
                                                    Descanso entre series: <span className="text-white font-semibold">{ex.restSeconds}s</span>
                                                </label>
                                                <input
                                                    type="range"
                                                    min="15"
                                                    max="300"
                                                    step="15"
                                                    className="w-full accent-primary"
                                                    value={ex.restSeconds}
                                                    onChange={(e) => updateField(idx, 'restSeconds', +e.target.value)}
                                                />
                                                <div className="flex justify-between text-[10px] text-gray-500">
                                                    <span>15s</span>
                                                    <span>1min</span>
                                                    <span>2min</span>
                                                    <span>3min</span>
                                                    <span>5min</span>
                                                </div>
                                            </div>

                                            {/* Volume preview */}
                                            {totalVolume && (
                                                <p className="text-xs text-gray-400 flex items-center gap-1">
                                                    <LuChartBar className="w-3.5 h-3.5" /> Volumen estimado: <span className="text-white">{totalVolume}</span>
                                                </p>
                                            )}

                                            {/* Link to exercise detail */}
                                            {ex.exercise?._id ? (
                                                <Link
                                                    to={`/exercises/${ex.exercise._id}`}
                                                    className="text-primary text-xs hover:underline inline-flex items-center gap-1"
                                                >
                                                    Ver detalle del ejercicio →
                                                </Link>
                                            ) : (
                                                <span className="text-red-400 text-xs flex items-center gap-1"><LuTriangleAlert className="w-3.5 h-3.5" /> Ejercicio no encontrado — elimínalo y agrégalo de nuevo</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Summary footer */}
                {exercises.length > 0 && (
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex flex-wrap gap-4 text-sm text-gray-400">
                        <span>
                            {getCurrentDayLabel()}: <span className="text-white font-semibold">{exercises.length}</span> ejercicios
                        </span>
                        <span>
                            Series: <span className="text-white font-semibold">
                                {exercises.reduce((s, e) => s + (e.sets || 0), 0)}
                            </span>
                        </span>
                        <span>
                            Duración: <span className="text-white font-semibold">
                                {formatDuration(duration)}
                            </span>
                        </span>
                    </div>
                )}
            </div>

            {/* Saving indicator */}
            {saving && (
                <div className="fixed bottom-4 right-4 bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-sm text-gray-300 shadow-xl">
                    <span className="flex items-center gap-1.5"><LuSave className="w-4 h-4 animate-pulse" /> Guardando…</span>
                </div>
            )}
            <ConfirmDialog
                open={confirmState.open}
                title={confirmState.title}
                message={confirmState.message}
                tone={confirmState.tone}
                confirmLabel={confirmState.confirmLabel}
                onCancel={closeConfirm}
                onConfirm={async () => {
                    const action = confirmState.action;
                    closeConfirm();
                    if (action) await action();
                }}
            />
        </div>
    );
}

