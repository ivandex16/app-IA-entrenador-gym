import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  LuActivity,
  LuBell,
  LuClipboardList,
  LuLoader,
  LuMessageSquare,
  LuPlus,
  LuRefreshCw,
  LuSave,
  LuShield,
  LuUsers,
} from 'react-icons/lu';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const GOALS = [
  { value: 'general', label: 'General' },
  { value: 'muscle_gain', label: 'Ganar musculo' },
  { value: 'fat_loss', label: 'Perder grasa' },
  { value: 'strength', label: 'Fuerza' },
  { value: 'toning', label: 'Tonificar' },
  { value: 'endurance', label: 'Resistencia' },
];

const EMPTY_EXERCISE = {
  exercise: '',
  sets: 3,
  repsMin: 8,
  repsMax: 12,
  restSeconds: 90,
};

const createDay = (index) => ({
  dayLabel: `Dia ${index + 1}`,
  exercises: [{ ...EMPTY_EXERCISE }],
});

const INITIAL_FORM = {
  clientId: '',
  title: '',
  description: '',
  goal: 'general',
  reminder: {
    enabled: false,
    weekday: '',
    time: '',
    message: '',
  },
  days: [createDay(0)],
};

const STATUS_LABELS = {
  active: 'Activa',
  completed: 'Completada',
  archived: 'Archivada',
};

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('es-CO', { dateStyle: 'medium' }) : '-';

function Field({ label, children }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-slate-300">{label}</span>
      {children}
    </label>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-900/80 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase tracking-wider text-slate-500">{label}</span>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <p className="text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-950/50 p-4">
      <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-xl font-black text-white mt-2">{value}</p>
    </div>
  );
}

export default function CoachingHub() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [clients, setClients] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [progress, setProgress] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [form, setForm] = useState(INITIAL_FORM);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [busyAssignment, setBusyAssignment] = useState('');
  const [busyTrainerClient, setBusyTrainerClient] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canAccess = user?.role === 'trainer' || user?.role === 'admin';

  const filteredAssignments = useMemo(() => {
    if (!selectedClientId) return assignments;
    return assignments.filter((item) => item.client?._id === selectedClientId);
  }, [assignments, selectedClientId]);

  const loadOverview = async (clientId = selectedClientId) => {
    const [overviewRes, assignmentsRes, exercisesRes] = await Promise.all([
      api.get('/coaching/overview'),
      api.get('/coaching/assignments'),
      api.get('/exercises'),
    ]);

    setStats(overviewRes.data.stats || {});
    setClients(overviewRes.data.clients || []);
    setTrainers(overviewRes.data.trainers || []);
    setAssignments(assignmentsRes.data || []);
    setExercises(exercisesRes.data || []);

    const nextClientId = clientId || overviewRes.data.clients?.[0]?._id || '';
    setSelectedClientId(nextClientId);
    setForm((prev) => ({ ...prev, clientId: prev.clientId || nextClientId }));

    if (nextClientId) {
      const { data } = await api.get(`/coaching/clients/${nextClientId}/progress`);
      setProgress(data);
    } else {
      setProgress(null);
    }
  };

  useEffect(() => {
    if (!canAccess) {
      setLoading(false);
      return;
    }

    loadOverview()
      .catch((err) => {
        toast.error(err.response?.data?.message || 'No se pudo cargar el modulo de coaching');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedClientId || !canAccess) return;
    api
      .get(`/coaching/clients/${selectedClientId}/progress`)
      .then(({ data }) => setProgress(data))
      .catch((err) => {
        toast.error(err.response?.data?.message || 'No se pudo cargar el progreso');
      });
  }, [selectedClientId]);

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateReminder = (key, value) => {
    setForm((prev) => ({
      ...prev,
      reminder: {
        ...prev.reminder,
        [key]: value,
      },
    }));
  };

  const updateDay = (dayIndex, patch) => {
    setForm((prev) => ({
      ...prev,
      days: prev.days.map((day, index) => (index === dayIndex ? { ...day, ...patch } : day)),
    }));
  };

  const updateExercise = (dayIndex, exerciseIndex, patch) => {
    setForm((prev) => ({
      ...prev,
      days: prev.days.map((day, currentDayIndex) => {
        if (currentDayIndex !== dayIndex) return day;
        return {
          ...day,
          exercises: day.exercises.map((exercise, currentExerciseIndex) =>
            currentExerciseIndex === exerciseIndex ? { ...exercise, ...patch } : exercise,
          ),
        };
      }),
    }));
  };

  const addDay = () => {
    setForm((prev) => ({ ...prev, days: [...prev.days, createDay(prev.days.length)] }));
  };

  const addExerciseToDay = (dayIndex) => {
    setForm((prev) => ({
      ...prev,
      days: prev.days.map((day, index) =>
        index === dayIndex
          ? { ...day, exercises: [...day.exercises, { ...EMPTY_EXERCISE }] }
          : day,
      ),
    }));
  };

  const removeExerciseFromDay = (dayIndex, exerciseIndex) => {
    setForm((prev) => ({
      ...prev,
      days: prev.days.map((day, index) =>
        index === dayIndex
          ? { ...day, exercises: day.exercises.filter((_, current) => current !== exerciseIndex) }
          : day,
        ),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        clientId: form.clientId || selectedClientId,
      };
      const { data } = await api.post('/coaching/assignments', payload);
      toast.success(data.message || 'Rutina asignada');
      setForm({
        ...INITIAL_FORM,
        clientId: payload.clientId,
      });
      await loadOverview(payload.clientId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo asignar la rutina');
    } finally {
      setSubmitting(false);
    }
  };

  const handleComment = async (assignmentId) => {
    const message = String(commentDrafts[assignmentId] || '').trim();
    if (!message) return;

    setBusyAssignment(assignmentId);
    try {
      const { data } = await api.post(`/coaching/assignments/${assignmentId}/comments`, { message });
      setAssignments((prev) =>
        prev.map((item) => (item._id === assignmentId ? { ...item, comments: data.comments } : item)),
      );
      setCommentDrafts((prev) => ({ ...prev, [assignmentId]: '' }));
      toast.success('Comentario guardado');
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo guardar el comentario');
    } finally {
      setBusyAssignment('');
    }
  };

  const handleStatus = async (assignmentId, status) => {
    setBusyAssignment(assignmentId);
    try {
      const { data } = await api.patch(`/coaching/assignments/${assignmentId}/status`, { status });
      setAssignments((prev) =>
        prev.map((item) =>
          item._id === assignmentId ? { ...item, status: data.assignment.status } : item,
        ),
      );
      toast.success('Estado actualizado');
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo actualizar el estado');
    } finally {
      setBusyAssignment('');
    }
  };

  const handleReminder = async (assignment) => {
    setBusyAssignment(assignment._id);
    try {
      const { data } = await api.patch(`/coaching/assignments/${assignment._id}/reminder`, assignment.reminder);
      setAssignments((prev) =>
        prev.map((item) =>
          item._id === assignment._id ? { ...item, reminder: data.reminder } : item,
        ),
      );
      toast.success('Recordatorio actualizado');
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo guardar el recordatorio');
    } finally {
      setBusyAssignment('');
    }
  };

  const handleAssignTrainer = async (clientId, trainerId) => {
    setBusyTrainerClient(clientId);
    try {
      await api.patch(`/admin/users/${clientId}/trainer`, { trainerId: trainerId || null });
      toast.success(trainerId ? 'Entrenador asignado' : 'Entrenador removido');
      await loadOverview(clientId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo actualizar el entrenador');
    } finally {
      setBusyTrainerClient('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LuLoader className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="rounded-3xl border border-slate-700/60 bg-slate-900/80 p-8">
          <h1 className="text-3xl font-black text-white">Modulo de coaching</h1>
          <p className="text-slate-400 mt-3">
            Esta seccion solo esta disponible para entrenadores y administradores.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12">
      <div className="max-w-7xl mx-auto px-4 py-12 space-y-6">
        <div className="rounded-3xl border border-slate-700/60 bg-slate-900/80 p-6">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300 border border-cyan-500/20">
                <LuUsers className="w-4 h-4" />
                Coaching Hub
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-white mt-4">
                Gestion de clientes y rutinas
              </h1>
              <p className="text-slate-400 mt-3 max-w-3xl">
                Desde aqui puedes asignar rutinas, revisar progreso, dejar observaciones y mantener historial completo.
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadOverview()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              <LuRefreshCw className="w-4 h-4" />
              Actualizar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard icon={LuUsers} label="Clientes" value={stats.totalClients || 0} />
          <StatCard icon={LuClipboardList} label="Rutinas activas" value={stats.activeAssignments || 0} />
          <StatCard icon={LuShield} label="Entrenadores" value={stats.totalTrainers || 0} />
          <StatCard icon={LuActivity} label="Entrenos registrados" value={stats.workoutCount || 0} />
        </div>

        <div className="grid xl:grid-cols-[340px,1fr] gap-6">
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-700/60 bg-slate-900/80 p-5">
              <h2 className="text-lg font-bold text-white mb-4">Clientes</h2>
              <div className="space-y-3 max-h-[560px] overflow-auto pr-1">
                {clients.map((client) => (
                  <div
                    key={client._id}
                    className={`rounded-2xl border p-4 ${
                      selectedClientId === client._id
                        ? 'border-cyan-500/40 bg-cyan-500/10'
                        : 'border-slate-700/60 bg-slate-950/40'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedClientId(client._id);
                        setForm((prev) => ({ ...prev, clientId: client._id }));
                      }}
                      className="w-full text-left"
                    >
                      <p className="font-semibold text-white">{client.name}</p>
                      <p className="text-xs text-slate-400 mt-1">{client.email}</p>
                      <div className="flex flex-wrap gap-2 mt-3 text-[11px] text-slate-300">
                        <span className="rounded-full bg-slate-800 px-2 py-1">{client.level || 'beginner'}</span>
                        <span className="rounded-full bg-slate-800 px-2 py-1">
                          {client.weight || '-'} kg / {client.height || '-'} cm
                        </span>
                      </div>
                    </button>

                    {user.role === 'admin' && (
                      <div className="mt-4">
                        <label className="block text-[11px] uppercase tracking-wider text-slate-500 mb-1">
                          Entrenador asignado
                        </label>
                        <select
                          value={client.assignedTrainer?._id || ''}
                          disabled={busyTrainerClient === client._id}
                          onChange={(event) => handleAssignTrainer(client._id, event.target.value)}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
                        >
                          <option value="">Sin entrenador</option>
                          {trainers.map((trainer) => (
                            <option key={trainer._id} value={trainer._id}>
                              {trainer.name} ({trainer.role})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                ))}
                {!clients.length && (
                  <div className="rounded-2xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">
                    No hay clientes disponibles para este perfil.
                  </div>
                )}
              </div>
            </div>

            {progress && (
              <div className="rounded-3xl border border-slate-700/60 bg-slate-900/80 p-5">
                <h2 className="text-lg font-bold text-white mb-4">Seguimiento</h2>
                <div className="grid grid-cols-2 gap-3">
                  <MiniStat label="Entrenos" value={progress.stats?.workoutCount || 0} />
                  <MiniStat label="Cumplimiento" value={`${progress.stats?.complianceRate || 0}%`} />
                  <MiniStat label="Repeticiones" value={progress.stats?.totalReps || 0} />
                  <MiniStat label="Peso maximo" value={`${progress.stats?.maxWeight || 0} kg`} />
                </div>
                <div className="mt-4 space-y-2">
                  {(progress.recentWorkouts || []).slice(0, 5).map((workout) => (
                    <div key={workout._id} className="rounded-2xl bg-slate-950/40 p-3">
                      <p className="text-sm font-semibold text-white">{workout.routine?.name || 'Entreno libre'}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {formatDate(workout.date)} · {workout.durationMinutes || 0} min
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-700/60 bg-slate-900/80 p-5">
              <h2 className="text-lg font-bold text-white mb-4">Nueva rutina asignada</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <Field label="Cliente">
                    <select
                      value={form.clientId}
                      onChange={(event) => updateForm('clientId', event.target.value)}
                      className="input-base"
                    >
                      <option value="">Selecciona cliente</option>
                      {clients.map((client) => (
                        <option key={client._id} value={client._id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Objetivo">
                    <select
                      value={form.goal}
                      onChange={(event) => updateForm('goal', event.target.value)}
                      className="input-base"
                    >
                      {GOALS.map((goal) => (
                        <option key={goal.value} value={goal.value}>
                          {goal.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <Field label="Titulo">
                    <input
                      value={form.title}
                      onChange={(event) => updateForm('title', event.target.value)}
                      className="input-base"
                      placeholder="Ej: Hipertrofia tren inferior"
                    />
                  </Field>
                  <Field label="Descripcion">
                    <input
                      value={form.description}
                      onChange={(event) => updateForm('description', event.target.value)}
                      className="input-base"
                      placeholder="Enfoque, notas y expectativas"
                    />
                  </Field>
                </div>

                <div className="rounded-2xl border border-slate-700/60 bg-slate-950/40 p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <p className="font-semibold text-white">Recordatorio automatico</p>
                    <label className="inline-flex items-center gap-2 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={form.reminder.enabled}
                        onChange={(event) => updateReminder('enabled', event.target.checked)}
                      />
                      Activar
                    </label>
                  </div>
                  <div className="grid md:grid-cols-3 gap-3">
                    <input
                      value={form.reminder.weekday}
                      onChange={(event) => updateReminder('weekday', event.target.value)}
                      className="input-base"
                      placeholder="Dia"
                    />
                    <input
                      type="time"
                      value={form.reminder.time}
                      onChange={(event) => updateReminder('time', event.target.value)}
                      className="input-base"
                    />
                    <input
                      value={form.reminder.message}
                      onChange={(event) => updateReminder('message', event.target.value)}
                      className="input-base"
                      placeholder="Mensaje"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-white">Dias y ejercicios</p>
                    <button
                      type="button"
                      onClick={addDay}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      <LuPlus className="w-4 h-4" />
                      Agregar dia
                    </button>
                  </div>

                  {form.days.map((day, dayIndex) => (
                    <div key={`${day.dayLabel}-${dayIndex}`} className="rounded-2xl border border-slate-700/60 bg-slate-950/40 p-4 space-y-3">
                      <input
                        value={day.dayLabel}
                        onChange={(event) => updateDay(dayIndex, { dayLabel: event.target.value })}
                        className="input-base"
                        placeholder="Nombre del dia"
                      />
                      {day.exercises.map((exerciseRow, exerciseIndex) => (
                        <div key={`${dayIndex}-${exerciseIndex}`} className="grid lg:grid-cols-[2fr,repeat(4,1fr),auto] gap-3">
                          <select
                            value={exerciseRow.exercise}
                            onChange={(event) => updateExercise(dayIndex, exerciseIndex, { exercise: event.target.value })}
                            className="input-base"
                          >
                            <option value="">Selecciona ejercicio</option>
                            {exercises.map((exercise) => (
                              <option key={exercise._id} value={exercise._id}>
                                {exercise.name}
                              </option>
                            ))}
                          </select>
                          <input type="number" min="1" value={exerciseRow.sets} onChange={(event) => updateExercise(dayIndex, exerciseIndex, { sets: event.target.value })} className="input-base" placeholder="Series" />
                          <input type="number" min="1" value={exerciseRow.repsMin} onChange={(event) => updateExercise(dayIndex, exerciseIndex, { repsMin: event.target.value })} className="input-base" placeholder="Reps min" />
                          <input type="number" min="1" value={exerciseRow.repsMax} onChange={(event) => updateExercise(dayIndex, exerciseIndex, { repsMax: event.target.value })} className="input-base" placeholder="Reps max" />
                          <input type="number" min="15" value={exerciseRow.restSeconds} onChange={(event) => updateExercise(dayIndex, exerciseIndex, { restSeconds: event.target.value })} className="input-base" placeholder="Descanso" />
                          <button
                            type="button"
                            onClick={() => removeExerciseFromDay(dayIndex, exerciseIndex)}
                            disabled={day.exercises.length === 1}
                            className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                          >
                            Quitar
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addExerciseToDay(dayIndex)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm font-semibold text-cyan-300 hover:bg-slate-800"
                      >
                        <LuPlus className="w-4 h-4" />
                        Agregar ejercicio
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {submitting ? <LuLoader className="w-4 h-4 animate-spin" /> : <LuSave className="w-4 h-4" />}
                  Asignar rutina
                </button>
              </form>
            </div>

            <div className="rounded-3xl border border-slate-700/60 bg-slate-900/80 p-5">
              <h2 className="text-lg font-bold text-white mb-4">Historial, comentarios y recordatorios</h2>
              <div className="space-y-4">
                {filteredAssignments.map((assignment) => (
                  <div key={assignment._id} className="rounded-2xl border border-slate-700/60 bg-slate-950/40 p-4 space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{assignment.title}</p>
                        <p className="text-sm text-slate-400 mt-1">{assignment.description || 'Sin descripcion.'}</p>
                        <p className="text-xs text-slate-500 mt-2">
                          {assignment.client?.name} · {assignment.trainer?.name} · {formatDate(assignment.createdAt)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {Object.keys(STATUS_LABELS).map((status) => (
                          <button key={status} type="button" disabled={busyAssignment === assignment._id} onClick={() => handleStatus(assignment._id, status)} className={`rounded-xl px-3 py-2 text-xs font-semibold border ${assignment.status === status ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300' : 'border-slate-700 bg-slate-900 text-slate-300'}`}>
                            {STATUS_LABELS[status]}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid xl:grid-cols-[1.1fr,1fr] gap-4">
                      <div className="rounded-2xl bg-slate-900/60 p-4">
                        <p className="font-semibold text-white mb-3">Dias de entrenamiento</p>
                        <div className="space-y-3">
                          {(assignment.days || []).map((day) => (
                            <div key={`${assignment._id}-${day.dayLabel}`} className="rounded-xl bg-slate-950/60 p-3">
                              <p className="text-sm font-semibold text-white">{day.dayLabel}</p>
                              <div className="mt-2 space-y-1">
                                {(day.exercises || []).map((exercise) => (
                                  <div key={`${day.dayLabel}-${exercise.exercise?._id || exercise.exercise}`} className="flex items-center justify-between gap-3 text-sm text-slate-300">
                                    <span>{exercise.exercise?.name || 'Ejercicio no disponible'}</span>
                                    <span className="text-xs text-slate-500">{exercise.sets} x {exercise.repsMin}-{exercise.repsMax}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="rounded-2xl bg-slate-900/60 p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <LuBell className="w-4 h-4 text-amber-300" />
                            <p className="font-semibold text-white">Recordatorio</p>
                          </div>
                          <div className="grid md:grid-cols-3 gap-3">
                            <input value={assignment.reminder?.weekday || ''} onChange={(event) => setAssignments((prev) => prev.map((item) => item._id === assignment._id ? { ...item, reminder: { ...item.reminder, weekday: event.target.value } } : item))} className="input-base" placeholder="Dia" />
                            <input type="time" value={assignment.reminder?.time || ''} onChange={(event) => setAssignments((prev) => prev.map((item) => item._id === assignment._id ? { ...item, reminder: { ...item.reminder, time: event.target.value } } : item))} className="input-base" />
                            <label className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300">
                              <input type="checkbox" checked={Boolean(assignment.reminder?.enabled)} onChange={(event) => setAssignments((prev) => prev.map((item) => item._id === assignment._id ? { ...item, reminder: { ...item.reminder, enabled: event.target.checked } } : item))} />
                              Activo
                            </label>
                          </div>
                          <textarea rows={2} value={assignment.reminder?.message || ''} onChange={(event) => setAssignments((prev) => prev.map((item) => item._id === assignment._id ? { ...item, reminder: { ...item.reminder, message: event.target.value } } : item))} className="input-base mt-3" placeholder="Mensaje de recordatorio" />
                          <button type="button" disabled={busyAssignment === assignment._id} onClick={() => handleReminder(assignment)} className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 mt-3">
                            <LuBell className="w-4 h-4" />
                            Guardar recordatorio
                          </button>
                        </div>

                        <div className="rounded-2xl bg-slate-900/60 p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <LuMessageSquare className="w-4 h-4 text-violet-300" />
                            <p className="font-semibold text-white">Comentarios y observaciones</p>
                          </div>
                          <div className="space-y-3 max-h-52 overflow-auto pr-1">
                            {(assignment.comments || []).map((comment) => (
                              <div key={comment._id} className="rounded-xl bg-slate-950/60 p-3">
                                <p className="text-sm font-semibold text-white">{comment.author?.name || 'Entrenador'}</p>
                                <p className="text-xs text-slate-500 mt-1">{formatDate(comment.createdAt)}</p>
                                <p className="text-sm text-slate-300 mt-2">{comment.message}</p>
                              </div>
                            ))}
                            {!assignment.comments?.length && <p className="text-sm text-slate-400">Sin comentarios todavia.</p>}
                          </div>
                          <textarea rows={3} value={commentDrafts[assignment._id] || ''} onChange={(event) => setCommentDrafts((prev) => ({ ...prev, [assignment._id]: event.target.value }))} className="input-base mt-3" placeholder="Escribe retroalimentacion para este cliente" />
                          <button type="button" disabled={busyAssignment === assignment._id} onClick={() => handleComment(assignment._id)} className="inline-flex items-center gap-2 rounded-xl bg-violet-500/15 px-3 py-2 text-sm font-semibold text-violet-300 hover:bg-violet-500/25 mt-3">
                            <LuMessageSquare className="w-4 h-4" />
                            Guardar comentario
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {!filteredAssignments.length && (
                  <div className="rounded-2xl border border-dashed border-slate-700 p-6 text-center text-slate-400">
                    No hay rutinas asignadas para el cliente seleccionado.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`.input-base{width:100%;border-radius:1rem;border:1px solid rgba(71,85,105,.8);background:rgb(2 6 23);padding:.75rem 1rem;font-size:.875rem;color:white;outline:none}.input-base:focus{border-color:rgb(6 182 212)}`}</style>
    </div>
  );
}
