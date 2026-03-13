import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import ConfirmDialog from '../components/ConfirmDialog';
import { LuActivity, LuDumbbell, LuFlame, LuHeart, LuSparkles, LuZap, LuFileUp, LuLightbulb, LuCalendar, LuTimer, LuTrash2, LuTriangleAlert, LuClipboardList, LuPlus, LuArrowRight, LuTarget } from 'react-icons/lu';

const GOALS = [
  { v: 'general', l: 'General', Icon: LuActivity, color: 'from-blue-500 to-cyan-400' },
  { v: 'muscle_gain', l: 'Ganar músculo', Icon: LuDumbbell, color: 'from-purple-500 to-indigo-500' },
  { v: 'fat_loss', l: 'Perder grasa', Icon: LuFlame, color: 'from-orange-500 to-red-500' },
  { v: 'endurance', l: 'Resistencia', Icon: LuHeart, color: 'from-rose-500 to-pink-500' },
  { v: 'toning', l: 'Tonificación', Icon: LuSparkles, color: 'from-amber-400 to-yellow-500' },
  { v: 'strength', l: 'Fuerza', Icon: LuZap, color: 'from-emerald-500 to-teal-500' },
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

// Card background images from Unsplash (gym themed, small size for performance)
const CARD_IMAGES = [
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80',
  'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&q=80',
  'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&q=80',
  'https://images.unsplash.com/photo-1605296867424-35fc25c9212a?w=600&q=80',
  'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=600&q=80',
  'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=600&q=80',
];

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

export default function Routines() {
  const navigate = useNavigate();
  const [routines, setRoutines] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', goal: 'general', selectedDays: ['lunes'] });
  const [showPdf, setShowPdf] = useState(false);
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfValidation, setPdfValidation] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const load = () => api.get('/routines').then((r) => setRoutines(r.data));

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const days = form.selectedDays.map((d) => {
        const wd = WEEKDAYS.find((w) => w.v === d);
        return { dayLabel: wd?.full || d, exercises: [] };
      });
      const { data } = await api.post('/routines', {
        name: form.name,
        description: form.description,
        goal: form.goal,
        days,
      });
      toast.success('Rutina creada — agrega ejercicios');
      setShowForm(false);
      setForm({ name: '', description: '', goal: 'general', selectedDays: ['lunes'] });
      navigate(`/routines/${data._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  const handleDelete = async (id) => {
    await api.delete(`/routines/${id}`);
    toast.success('Eliminada');
    load();
  };

  const handlePdfUpload = async (e) => {
    e.preventDefault();
    if (!pdfFile) return;
    setPdfUploading(true);
    setPdfValidation(null);
    try {
      const formData = new FormData();
      formData.append('pdf', pdfFile);
      const { data } = await api.post('/routines/upload-pdf', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(data.message);
      if (data.created?.length) {
        toast(`Nuevos ejercicios agregados al catálogo: ${data.created.join(', ')}`, { duration: 6000 });
      }
      setShowPdf(false);
      setPdfFile(null);
      load();
      if (data.routine?._id) navigate(`/routines/${data.routine._id}`);
    } catch (err) {
      if (err.response?.status === 422) {
        setPdfValidation(err.response.data);
      }
      toast.error(err.response?.data?.message || 'Error al procesar el PDF');
    } finally {
      setPdfUploading(false);
    }
  };

  const getGoal = (v) => GOALS.find((g) => g.v === v) || GOALS[0];

  return (
    <div className="min-h-screen">
      {/* ══════════ HERO BANNER ══════════ */}
      <div className="relative overflow-hidden">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1400&q=80)' }}
        />
        {/* Dark overlay with gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-dark/80 via-dark/70 to-dark" />
        {/* Accent glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/20 rounded-full blur-[120px]" />

        <div className="relative max-w-6xl mx-auto px-4 pt-12 pb-16">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="animate-fadeInUp">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-indigo-400 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
                  <LuDumbbell className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                    Mis <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Rutinas</span>
                  </h1>
                </div>
              </div>
              <p className="text-gray-400 text-base md:text-lg max-w-lg">
                Diseña, organiza y domina tus entrenamientos. Cada rutina te acerca más a tus metas.
              </p>
              {/* Stats strip */}
              {routines.length > 0 && (
                <div className="flex gap-6 mt-5">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{routines.length}</p>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Rutinas</p>
                  </div>
                  <div className="w-px bg-slate-700" />
                  <div className="text-center">
                    <p className="text-2xl font-bold text-accent">
                      {routines.reduce((sum, r) => {
                        const allExs = (r.days || []).flatMap((d) => d.exercises || []);
                        return sum + (allExs.length || r.exercises?.length || 0);
                      }, 0)}
                    </p>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Ejercicios</p>
                  </div>
                  <div className="w-px bg-slate-700" />
                  <div className="text-center">
                    <p className="text-2xl font-bold text-emerald-400">
                      {routines.reduce((sum, r) => sum + (r.days?.length || 0), 0)}
                    </p>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Días</p>
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div data-tour="routines-actions" className="flex gap-3 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
              <button
                onClick={() => { setShowPdf(!showPdf); setShowForm(false); }}
                className="group bg-slate-800/80 backdrop-blur-sm hover:bg-slate-700 border border-slate-600/50 hover:border-primary/50 px-5 py-3 rounded-2xl text-sm font-semibold transition-all flex items-center gap-2 shadow-lg"
              >
                <LuFileUp className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" /> Subir PDF
              </button>
              <button
                onClick={() => { setShowForm(!showForm); setShowPdf(false); }}
                className="group bg-gradient-to-r from-primary to-indigo-600 hover:from-indigo-600 hover:to-primary px-6 py-3 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02]"
              >
                {showForm ? (
                  'Cancelar'
                ) : (
                  <>
                    <LuPlus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" /> Nueva Rutina
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-4 space-y-6 pb-12">
        {/* PDF upload */}
        {showPdf && (
          <div className="animate-slideUp bg-slate-800/90 backdrop-blur-sm border border-slate-700/50 p-6 rounded-2xl space-y-4 shadow-xl">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <div className="w-8 h-8 bg-primary/20 rounded-xl flex items-center justify-center">
                <LuFileUp className="w-4 h-4 text-primary" />
              </div>
              Importar Rutina desde PDF
            </h2>

            <div className="bg-slate-700/40 border border-slate-600/50 rounded-xl p-4 space-y-2">
              <h3 className="text-sm font-semibold text-primary flex items-center gap-1.5"><LuLightbulb className="w-4 h-4" /> ¿Qué debe contener el PDF?</h3>
              <p className="text-xs text-gray-300">Para que el sistema pueda leer correctamente tu rutina, el PDF debe tener este formato:</p>
              <div className="bg-slate-900/80 rounded-lg p-3 text-xs text-gray-300 font-mono whitespace-pre-line border border-slate-700/50">
{`Nombre: Mi Rutina Personalizada
Descripción: Rutina de fuerza 4 días

Lunes - Pecho y Tríceps
  Press de Banca: 4x10 @90s
  Flexiones: 3x15 @60s

Martes - Espalda y Bíceps
  Peso Muerto: 4x8 @120s
  Curl con Barra: 3x12 @60s

Jueves - Piernas
  Sentadilla: 4x10 @120s
  Prensa de Piernas: 3x12 @90s`}
              </div>
              <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
                <li><strong>Día:</strong> Usa el nombre del día seguido de un guión y la descripción.</li>
                <li><strong>Ejercicio:</strong> Debe ir exactamente como <code>Press de Banca: 4x10 @90s</code>.</li>
                <li><strong>Nombre:</strong> (Opcional) primera línea con "Nombre: ...".</li>
                <li><strong>Descripción:</strong> (Opcional) segunda línea con "Descripción: ...".</li>
                <li>Si una línea no cumple el formato, se rechaza todo el PDF.</li>
                <li>Si un ejercicio no existe en el catálogo, también se rechaza y se muestran sugerencias.</li>
              </ul>
            </div>

            {pdfValidation && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-red-300">El PDF no se pudo importar</h3>
                  <p className="text-xs text-gray-300 mt-1">{pdfValidation.hint || pdfValidation.message}</p>
                </div>

                {Array.isArray(pdfValidation.issues) && pdfValidation.issues.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-red-200">Errores de formato</p>
                    <ul className="space-y-2 text-xs text-gray-300">
                      {pdfValidation.issues.slice(0, 8).map((issue, idx) => (
                        <li key={`${issue.line || issue.dayLabel || idx}-${idx}`} className="bg-slate-900/70 border border-slate-700 rounded-lg p-2">
                          <p>{issue.message}</p>
                          {issue.line && <p className="text-gray-500 mt-1">Linea {issue.line}: {issue.content}</p>}
                          {issue.dayLabel && <p className="text-gray-500 mt-1">{issue.dayLabel}</p>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {Array.isArray(pdfValidation.missingExercises) && pdfValidation.missingExercises.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-red-200">Ejercicios no encontrados</p>
                    <ul className="space-y-2 text-xs text-gray-300">
                      {pdfValidation.missingExercises.slice(0, 8).map((item, idx) => (
                        <li key={`${item.exercise}-${idx}`} className="bg-slate-900/70 border border-slate-700 rounded-lg p-2">
                          <p><strong>{item.exercise}</strong> en {item.day}</p>
                          {item.suggestions?.length > 0 && (
                            <p className="text-gray-500 mt-1">Sugerencias: {item.suggestions.join(', ')}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handlePdfUpload} className="flex items-end gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-400 mb-1 block">Selecciona un archivo PDF</label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => { setPdfFile(e.target.files[0]); setPdfValidation(null); }}
                  className="w-full bg-slate-700/60 rounded-xl px-4 py-2.5 text-sm file:mr-3 file:py-1.5 file:px-4 file:rounded-xl file:border-0 file:bg-primary file:text-white file:text-sm file:cursor-pointer file:font-semibold hover:bg-slate-700 transition"
                />
              </div>
              <button
                type="submit"
                disabled={!pdfFile || pdfUploading}
                className="bg-gradient-to-r from-primary to-indigo-600 disabled:opacity-50 px-6 py-2.5 rounded-xl text-sm font-semibold transition shadow-lg shadow-primary/20"
              >
                {pdfUploading ? 'Procesando…' : 'Importar'}
              </button>
            </form>
          </div>
        )}

        {/* Create form */}
        {showForm && (
          <form onSubmit={handleCreate} className="animate-slideUp bg-slate-800/90 backdrop-blur-sm border border-slate-700/50 p-6 rounded-2xl space-y-5 shadow-xl">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <div className="w-8 h-8 bg-primary/20 rounded-xl flex items-center justify-center">
                <LuPlus className="w-4 h-4 text-primary" />
              </div>
              Crear nueva rutina
            </h2>
            <input
              placeholder="Nombre de la rutina (ej: Push Day, Tren Superior…)"
              required
              className="w-full bg-slate-700/60 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/50 border border-slate-600/50 focus:border-primary transition"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <textarea
              placeholder="Descripción (opcional)"
              rows={2}
              className="w-full bg-slate-700/60 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/50 border border-slate-600/50 focus:border-primary transition resize-none"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs text-gray-400 mb-2 block font-medium uppercase tracking-wide">Días de entrenamiento</label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((wd) => {
                    const selected = form.selectedDays.includes(wd.v);
                    return (
                      <button
                        key={wd.v}
                        type="button"
                        onClick={() => {
                          setForm((f) => ({
                            ...f,
                            selectedDays: selected
                              ? f.selectedDays.filter((d) => d !== wd.v)
                              : [...f.selectedDays, wd.v],
                          }));
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                          selected
                            ? 'bg-gradient-to-r from-primary/30 to-indigo-500/30 border-primary text-white shadow-md shadow-primary/10'
                            : 'bg-slate-700/60 border-slate-600/50 text-gray-400 hover:border-primary/50 hover:text-gray-200'
                        }`}
                      >
                        {wd.l}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="text-xs text-gray-400 mb-2 block font-medium uppercase tracking-wide">Objetivo</label>
                <select
                  className="w-full bg-slate-700/60 rounded-xl px-4 py-3 border border-slate-600/50 focus:border-primary focus:ring-2 focus:ring-primary/50 transition outline-none"
                  value={form.goal}
                  onChange={(e) => setForm({ ...form, goal: e.target.value })}
                >
                  {GOALS.map((g) => (
                    <option key={g.v} value={g.v}>{g.l}</option>
                  ))}
                </select>
              </div>
            </div>
            <button className="bg-gradient-to-r from-primary to-indigo-600 hover:from-indigo-600 hover:to-primary px-8 py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] flex items-center gap-2">
              Crear y agregar ejercicios <LuArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Empty state */}
        {routines.length === 0 && !showForm && (
          <div className="animate-fadeInUp text-center py-20 space-y-5">
            <div className="relative inline-block">
              <div className="w-24 h-24 bg-gradient-to-br from-primary/20 to-indigo-500/20 rounded-3xl flex items-center justify-center mx-auto border border-primary/20">
                <LuDumbbell className="w-12 h-12 text-primary animate-float" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center border border-accent/30">
                <LuPlus className="w-4 h-4 text-accent" />
              </div>
            </div>
            <div>
              <p className="text-gray-300 text-xl font-semibold">Aún no tienes rutinas</p>
              <p className="text-gray-500 mt-1">Crea tu primera rutina y comienza a transformar tu entrenamiento</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-primary to-indigo-600 hover:from-indigo-600 hover:to-primary px-8 py-3 rounded-2xl text-sm font-bold transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] inline-flex items-center gap-2"
            >
              <LuPlus className="w-5 h-5" /> Crear mi primera rutina
            </button>
          </div>
        )}

        {/* Routine cards */}
        {routines.length > 0 && (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {routines.map((r, idx) => {
              const goal = getGoal(r.goal);
              const dayCount = r.days?.length || 0;
              const allExs = (r.days || []).flatMap((d) => d.exercises || []);
              const legacyExs = r.exercises || [];
              const allExercises = allExs.length > 0 ? allExs : legacyExs;
              const exCount = allExercises.length;
              const duration = estimateDuration(allExercises);
              const muscleGroups = [...new Set(
                allExercises
                  .map((e) => e.exercise?.muscleGroup)
                  .filter(Boolean)
              )];
              const cardImage = CARD_IMAGES[idx % CARD_IMAGES.length];

              return (
                <Link
                  to={`/routines/${r._id}`}
                  key={r._id}
                  className="animate-fadeInUp group relative bg-slate-800/80 backdrop-blur-sm rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 block border border-slate-700/50 hover:border-primary/40 hover:-translate-y-1"
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  {/* Card image header */}
                  <div className="relative h-36 overflow-hidden">
                    <img
                      src={cardImage}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />

                    {/* Goal badge */}
                    <div className={`absolute top-3 left-3 bg-gradient-to-r ${goal.color} px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 shadow-lg`}>
                      <goal.Icon className="w-3.5 h-3.5" /> {goal.l}
                    </div>

                    {/* AI badge */}
                    {r.isAIGenerated && (
                      <div className="absolute top-3 right-3 bg-gradient-to-r from-violet-600/90 to-purple-600/90 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-lg border border-white/10">
                        <LuSparkles className="w-3 h-3" /> IA
                      </div>
                    )}

                    {/* Delete button */}
                    <button
                      onClick={(e) => { e.preventDefault(); setConfirmDeleteId(r._id); }}
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 bg-red-500/80 backdrop-blur-sm hover:bg-red-500 text-white p-1.5 rounded-full transition-all shadow-lg"
                      title="Eliminar"
                      style={{ right: r.isAIGenerated ? '5rem' : '0.75rem' }}
                    >
                      <LuTrash2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Title overlay */}
                    <div className="absolute bottom-3 left-4 right-4">
                      <h3 className="font-bold text-lg text-white drop-shadow-lg truncate group-hover:text-primary transition-colors">
                        {r.name}
                      </h3>
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="p-4 space-y-3">
                    {r.description && (
                      <p className="text-sm text-gray-400 line-clamp-2">{r.description}</p>
                    )}

                    {/* Day pills */}
                    <div className="flex flex-wrap gap-1.5">
                      {(r.days || []).map((d) => (
                        <span key={d.dayLabel} className="bg-slate-700/60 text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 border border-slate-600/30 font-medium">
                          <LuCalendar className="w-3 h-3 text-primary" /> {d.dayLabel}
                        </span>
                      ))}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-3 pt-2 border-t border-slate-700/50">
                      <div className="flex items-center gap-1.5 text-sm">
                        <div className="w-6 h-6 bg-primary/15 rounded-lg flex items-center justify-center">
                          <LuTarget className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <span className="text-primary font-bold">{exCount}</span>
                        <span className="text-gray-500 text-xs">{exCount === 1 ? 'ejercicio' : 'ejercicios'}</span>
                      </div>
                      {exCount > 0 && (
                        <div className="flex items-center gap-1.5 text-sm">
                          <div className="w-6 h-6 bg-accent/15 rounded-lg flex items-center justify-center">
                            <LuTimer className="w-3.5 h-3.5 text-accent" />
                          </div>
                          <span className="text-gray-400">~{formatDuration(duration)}</span>
                        </div>
                      )}
                      <LuArrowRight className="w-4 h-4 text-gray-600 ml-auto group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>

                    {/* Muscle groups */}
                    {muscleGroups.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {muscleGroups.slice(0, 4).map((mg) => (
                          <span key={mg} className="bg-gradient-to-r from-primary/10 to-indigo-500/10 text-primary text-[10px] px-2.5 py-0.5 rounded-full capitalize font-semibold border border-primary/20">
                            {mg}
                          </span>
                        ))}
                        {muscleGroups.length > 4 && (
                          <span className="text-[10px] text-gray-500 px-1 py-0.5">
                            +{muscleGroups.length - 4} más
                          </span>
                        )}
                      </div>
                    )}

                    {/* Empty routine hint */}
                    {exCount === 0 && (
                      <p className="text-xs text-amber-400/80 mt-1 flex items-center gap-1.5 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
                        <LuTriangleAlert className="w-3.5 h-3.5" /> Sin ejercicios — toca para agregar
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
      <ConfirmDialog
        open={Boolean(confirmDeleteId)}
        title="Eliminar rutina"
        message="La rutina seleccionada se eliminara de forma permanente."
        tone="danger"
        confirmLabel="Eliminar"
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={async () => {
          const routineId = confirmDeleteId;
          setConfirmDeleteId(null);
          if (routineId) await handleDelete(routineId);
        }}
      />
    </div>
  );
}





