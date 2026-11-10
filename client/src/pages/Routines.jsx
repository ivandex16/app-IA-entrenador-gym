import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  LuActivity,
  LuDumbbell,
  LuFlame,
  LuHeart,
  LuSparkles,
  LuZap,
  LuFileUp,
  LuLightbulb,
  LuCalendar,
  LuTimer,
  LuTrash2,
  LuTriangleAlert,
  LuClipboardList,
  LuPlus,
  LuArrowRight,
  LuTarget,
  LuSearch,
  LuX,
  LuLayers,
  LuImageUp,
} from 'react-icons/lu';
import ImageImportPanel from '../components/routines/imageImport/ImageImportPanel';

const GOALS = [
  { v: 'general', l: 'General', Icon: LuActivity, color: 'from-blue-500 to-cyan-400' },
  { v: 'muscle_gain', l: 'Ganar músculo', Icon: LuDumbbell, color: 'from-purple-500 to-indigo-500' },
  { v: 'fat_loss', l: 'Perder grasa', Icon: LuFlame, color: 'from-orange-500 to-red-500' },
  { v: 'endurance', l: 'Resistencia', Icon: LuHeart, color: 'from-rose-500 to-pink-500' },
  { v: 'toning', l: 'Tonificación', Icon: LuSparkles, color: 'from-amber-400 to-yellow-500' },
  { v: 'strength', l: 'Fuerza', Icon: LuZap, color: 'from-emerald-500 to-teal-500' },
];

const FILTER_GOALS = [
  { v: 'all', l: 'Todas' },
  { v: 'muscle_gain', l: 'Músculo' },
  { v: 'strength', l: 'Fuerza' },
  { v: 'fat_loss', l: 'Perder Grasa' },
  { v: 'endurance', l: 'Resistencia' },
  { v: 'toning', l: 'Tonificación' },
  { v: 'general', l: 'General' },
];

// Card background images from Unsplash (gym themed, high performance)
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
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function Routines() {
  const navigate = useNavigate();
  const [routines, setRoutines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPdf, setShowPdf] = useState(false);
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [showImage, setShowImage] = useState(false); // image import (independent from PDF)

  // Quick Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGoalFilter, setSelectedGoalFilter] = useState('all');

  const load = () => {
    setLoading(true);
    return api
      .get('/routines')
      .then((r) => setRoutines(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta rutina?')) return;
    try {
      await api.delete(`/routines/${id}`);
      toast.success('Rutina eliminada');
      load();
    } catch (err) {
      toast.error('Error al eliminar');
    }
  };

  const handlePdfUpload = async (e) => {
    e.preventDefault();
    if (!pdfFile) return;
    setPdfUploading(true);
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
      toast.error(err.response?.data?.message || 'Error al procesar el PDF');
    } finally {
      setPdfUploading(false);
    }
  };

  const getGoal = (v) => GOALS.find((g) => g.v === v) || GOALS[0];

  // Filtered routines list
  const filteredRoutines = routines.filter((r) => {
    const matchesSearch =
      !searchQuery ||
      r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGoal =
      selectedGoalFilter === 'all' || r.goal === selectedGoalFilter;
    return matchesSearch && matchesGoal;
  });

  const totalExercises = routines.reduce((sum, r) => {
    const allExs = (r.days || []).flatMap((d) => d.exercises || []);
    return sum + (allExs.length || r.exercises?.length || 0);
  }, 0);

  const totalDays = routines.reduce((sum, r) => sum + (r.days?.length || 0), 0);

  return (
    <div className="min-h-screen bg-[#08090D] text-slate-100 pb-20 selection:bg-lime-400 selection:text-slate-950 font-sans">
      {/* ── Ambient Athletic Lighting ── */}
      <div className="fixed top-0 left-1/3 w-[500px] h-[260px] bg-lime-400/[0.04] rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed top-24 right-1/4 w-[400px] h-[300px] bg-cyan-500/[0.03] rounded-full blur-[140px] pointer-events-none" />

      {/* ══════════════ 1. HERO BANNER INMERSIVO ══════════════ */}
      <header className="relative overflow-hidden border-b border-white/[0.08] pt-10 pb-12">
        {/* Background Gym Photography with High-Performance Overlays */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage:
              'url(https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1400&q=80)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#08090D]/85 via-[#08090D]/90 to-[#08090D]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-lime-400/[0.07] via-transparent to-transparent pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">

            {/* Title & Athletic Value Proposition */}
            <div className="space-y-2 animate-fadeInUp">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-lime-400 via-lime-300 to-emerald-400 flex items-center justify-center shadow-lg shadow-lime-400/25">
                  <LuDumbbell className="w-6 h-6 text-black stroke-[2.5]" />
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white uppercase drop-shadow-md">
                    Mis{' '}
                    <span className="bg-gradient-to-r from-lime-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                      Rutinas
                    </span>
                  </h1>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 max-w-lg font-medium leading-relaxed drop-shadow">
                Diseña, estructura y domina cada sesión. Planifica tu progreso semanal y maximiza tus levantamientos.
              </p>

              {/* Stats Strip */}
              {routines.length > 0 && (
                <div className="flex items-center gap-4 sm:gap-6 pt-2">
                  <div className="flex items-center gap-2 bg-[#12141F]/80 backdrop-blur-md border border-white/[0.08] px-3.5 py-1.5 rounded-xl">
                    <span className="text-base sm:text-lg font-black text-lime-400">{routines.length}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rutinas</span>
                  </div>
                  <div className="flex items-center gap-2 bg-[#12141F]/80 backdrop-blur-md border border-white/[0.08] px-3.5 py-1.5 rounded-xl">
                    <span className="text-base sm:text-lg font-black text-cyan-400">{totalExercises}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ejercicios</span>
                  </div>
                  <div className="flex items-center gap-2 bg-[#12141F]/80 backdrop-blur-md border border-white/[0.08] px-3.5 py-1.5 rounded-xl">
                    <span className="text-base sm:text-lg font-black text-emerald-400">{totalDays}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Días</span>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons (Tour preserved: routines-actions) */}
            <div data-tour="routines-actions" className="flex flex-wrap items-center gap-3 animate-fadeInUp">
              <button
                onClick={() => {
                  setShowPdf(!showPdf);
                }}
                className={`min-h-[44px] px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center gap-2 border active:scale-95 ${
                  showPdf
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                    : 'bg-[#12141F]/90 backdrop-blur-md hover:bg-white/[0.08] border-white/[0.1] text-zinc-200'
                }`}
              >
                <LuFileUp className="w-4 h-4 text-cyan-400" />
                <span>{showPdf ? 'Cerrar PDF' : 'Subir PDF'}</span>
              </button>

              <button
                onClick={() => {
                  setShowImage((v) => !(v && !showPdf));
                  setShowPdf(false);
                }}
                className={`min-h-[44px] px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center gap-2 border active:scale-95 ${
                  showImage && !showPdf
                    ? 'bg-lime-400/15 text-lime-300 border-lime-400/40 shadow-lg shadow-lime-400/10'
                    : 'bg-[#12141F]/90 backdrop-blur-md hover:bg-white/[0.08] border-white/[0.1] text-zinc-200'
                }`}
              >
                <LuImageUp className="w-4 h-4 text-lime-400" />
                <span>{showImage && !showPdf ? 'Cerrar imagen' : 'Subir imagen'}</span>
              </button>

              <button
                onClick={() => navigate('/routines/new')}
                className="min-h-[44px] px-5 sm:px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center gap-2 shadow-lg active:scale-95 bg-lime-400 hover:bg-lime-300 text-slate-950 shadow-lime-400/25"
              >
                <LuPlus className="w-4 h-4 stroke-[3]" />
                <span>Nueva Rutina</span>
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* ══════════════ 2. MAIN WORKSPACE CONTAINER ══════════════ */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 mt-8 space-y-7">

        {/* ── A. PDF IMPORT DRAWER / MODAL ── */}
        {showPdf && (
          <div className="animate-slideUp bg-[#0E1018]/95 backdrop-blur-xl border border-white/[0.1] p-6 sm:p-8 rounded-3xl space-y-5 shadow-2xl shadow-black/80">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-400/10 border border-cyan-400/25 flex items-center justify-center text-cyan-400">
                  <LuFileUp className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-black text-lg text-white uppercase tracking-tight">
                    Importar Rutina desde PDF
                  </h2>
                  <p className="text-xs text-zinc-400 font-medium">Sube tu archivo para autogenerar los días y ejercicios</p>
                </div>
              </div>
              <button
                onClick={() => setShowPdf(false)}
                className="w-8 h-8 rounded-lg bg-white/[0.05] hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <LuX className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#131622] border border-white/[0.06] rounded-2xl p-4 sm:p-5 space-y-3">
              <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                <LuLightbulb className="w-4 h-4" /> Formato Compatible del Documento
              </h3>
              <p className="text-xs text-zinc-300">
                El analizador detecta bloques diarios y esquemas de series x repeticiones:
              </p>
              <div className="bg-[#090A0F] rounded-xl p-3.5 text-xs text-zinc-300 font-mono whitespace-pre-line border border-white/[0.06] overflow-x-auto">
{`Nombre: Torso Fuerza
Descripción: Rutina de hipertrofia y fuerza

Lunes - Pecho y Tríceps
  Press de Banca: 4x10 @90s
  Flexiones: 3x15 @60s

Martes - Espalda y Bíceps
  Peso Muerto: 4x8 @120s
  Dominadas: 3x10 @90s`}
              </div>
            </div>

            <form onSubmit={handlePdfUpload} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 pt-2">
              <div className="flex-1">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">
                  Selecciona tu PDF
                </label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setPdfFile(e.target.files[0])}
                  className="w-full bg-[#131622] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-zinc-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-cyan-500/20 file:text-cyan-300 file:text-xs file:font-bold file:cursor-pointer hover:border-cyan-500/40 transition cursor-pointer"
                />
              </div>
              <button
                type="submit"
                disabled={!pdfFile || pdfUploading}
                className="min-h-[44px] bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-150 shadow-lg shadow-cyan-500/20 active:scale-95"
              >
                {pdfUploading ? 'Analizando Documento...' : 'Importar Rutina'}
              </button>
            </form>
          </div>
        )}

        {/* ── A2. IMAGE IMPORT (OCR + review; separate from the PDF import) ── */}
        {showImage && !showPdf && (
          <ImageImportPanel
            onClose={() => setShowImage(false)}
            onCreated={(routine) => {
              setShowImage(false);
              load();
              if (routine?._id) navigate(`/routines/${routine._id}`);
            }}
          />
        )}

        {/* ── C. CONTROL BAR (Búsqueda Rápida y Filtros Deslizables) ── */}
        {routines.length > 0 && (
          <div className="space-y-3.5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <LuSearch className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar rutina por nombre o descripción..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0E1018] border border-white/[0.08] focus:border-lime-400/60 rounded-xl pl-10 pr-9 py-2.5 text-xs text-white placeholder:text-zinc-500 outline-none transition-all duration-150 focus:ring-1 focus:ring-lime-400/30"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                  >
                    <LuX className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Counter Pill */}
              <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 px-1">
                <span>Mostrando</span>
                <span className="px-2 py-0.5 rounded-lg bg-lime-400/10 text-lime-400 font-bold border border-lime-400/20 font-mono">
                  {filteredRoutines.length}
                </span>
                <span>de {routines.length}</span>
              </div>
            </div>

            {/* Goal Filter Pills Strip */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 mr-1.5 shrink-0 flex items-center gap-1">
                <LuLayers className="w-3.5 h-3.5" />
                Filtro:
              </span>
              {FILTER_GOALS.map((fg) => {
                const active = selectedGoalFilter === fg.v;
                return (
                  <button
                    key={fg.v}
                    onClick={() => setSelectedGoalFilter(fg.v)}
                    className={`min-h-[34px] px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 active:scale-95 shrink-0 border ${
                      active
                        ? 'bg-lime-400 text-black border-lime-400 shadow-sm shadow-lime-400/20 font-black'
                        : 'bg-[#0E1018] text-zinc-400 hover:text-white border-white/[0.08] hover:border-white/20'
                    }`}
                  >
                    {fg.l}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── D. SKELETON LOADING STATE ── */}
        {loading && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-[#0E1018] border border-white/[0.06] rounded-3xl overflow-hidden h-[360px] animate-pulse space-y-4 p-4"
              >
                <div className="h-36 bg-white/[0.04] rounded-2xl" />
                <div className="h-5 w-2/3 bg-white/[0.04] rounded-lg" />
                <div className="h-4 w-full bg-white/[0.04] rounded-lg" />
                <div className="h-9 w-full bg-white/[0.04] rounded-xl mt-6" />
              </div>
            ))}
          </div>
        )}

        {/* ── E. EMPTY STATE (Sin Rutinas o Sin Resultados) ── */}
        {!loading && routines.length === 0 && (
          <div className="animate-fadeInUp text-center py-20 bg-[#0E1018]/60 border border-white/[0.06] rounded-3xl space-y-5 px-6">
            <div className="relative inline-block">
              <div className="w-20 h-20 rounded-3xl bg-lime-400/10 border border-lime-400/25 flex items-center justify-center mx-auto text-lime-400 shadow-lg shadow-lime-400/5">
                <LuDumbbell className="w-10 h-10 animate-pulse" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">
                Aún no tienes rutinas registradas
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-sm mx-auto mt-1 font-medium">
                Crea tu primera rutina manual o importa un plan desde PDF para comenzar a registrar sesiones.
              </p>
            </div>
            <button
              onClick={() => navigate('/routines/new')}
              className="min-h-[46px] bg-lime-400 hover:bg-lime-300 text-slate-950 px-7 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 shadow-lg shadow-lime-400/25 active:scale-95 inline-flex items-center gap-2"
            >
              <LuPlus className="w-4 h-4 stroke-[3]" />
              <span>Crear mi primera rutina</span>
            </button>
          </div>
        )}

        {/* ── F. NO RESULTS WITH ACTIVE FILTERS ── */}
        {!loading && routines.length > 0 && filteredRoutines.length === 0 && (
          <div className="text-center py-16 bg-[#0E1018]/60 border border-white/[0.06] rounded-3xl space-y-4 px-6">
            <p className="text-sm font-bold text-zinc-300">
              No se encontraron rutinas con el filtro o término actual
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedGoalFilter('all');
              }}
              className="text-xs font-bold text-lime-400 hover:underline uppercase tracking-wider"
            >
              Restablecer filtros
            </button>
          </div>
        )}

        {/* ── G. ROUTINES HIGH-PERFORMANCE CARDS GRID ── */}
        {!loading && filteredRoutines.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredRoutines.map((r, idx) => {
              const goal = getGoal(r.goal);
              const allExs = (r.days || []).flatMap((d) => d.exercises || []);
              const legacyExs = r.exercises || [];
              const allExercises = allExs.length > 0 ? allExs : legacyExs;
              const exCount = allExercises.length;
              const duration = estimateDuration(allExercises);
              const muscleGroups = [
                ...new Set(
                  allExercises
                    .map((e) => e.exercise?.muscleGroup)
                    .filter(Boolean)
                ),
              ];
              const cardImage = CARD_IMAGES[idx % CARD_IMAGES.length];

              return (
                <Link
                  to={`/routines/${r._id}`}
                  key={r._id}
                  className="group relative bg-[#0E1018] rounded-3xl overflow-hidden border border-white/[0.08] hover:border-lime-400/40 hover:shadow-2xl hover:shadow-lime-400/5 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    {/* Cover Photography with Athletic Vignette */}
                    <div className="relative h-44 overflow-hidden">
                      <img
                        src={cardImage}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0E1018] via-[#0E1018]/60 to-transparent" />

                      {/* Goal Badge */}
                      <div
                        className={`absolute top-3 left-3 bg-gradient-to-r ${goal.color} px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-white flex items-center gap-1.5 shadow-lg shadow-black/40`}
                      >
                        <goal.Icon className="w-3.5 h-3.5" />
                        <span>{goal.l}</span>
                      </div>

                      {/* AI Generated Badge */}
                      {r.isAIGenerated && (
                        <div className="absolute top-3 right-11 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md border border-white/20">
                          <LuSparkles className="w-3 h-3 text-amber-300" />
                          <span>IA Coach</span>
                        </div>
                      )}

                      {/* Delete Button */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleDelete(r._id);
                        }}
                        className="absolute top-3 right-3 w-8 h-8 rounded-xl bg-black/60 hover:bg-rose-600 text-zinc-300 hover:text-white flex items-center justify-center transition-all duration-150 backdrop-blur-md border border-white/10 active:scale-90"
                        title="Eliminar rutina"
                      >
                        <LuTrash2 className="w-4 h-4" />
                      </button>

                      {/* Card Title on Image */}
                      <div className="absolute bottom-3 left-4 right-4">
                        <h3 className="font-black text-xl text-white tracking-tight drop-shadow-md truncate group-hover:text-lime-400 transition-colors duration-200">
                          {r.name}
                        </h3>
                      </div>
                    </div>

                    {/* Card Content Body */}
                    <div className="p-5 space-y-4">
                      {r.description && (
                        <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                          {r.description}
                        </p>
                      )}

                      {/* Scheduled Training Days */}
                      <div className="flex flex-wrap gap-1.5">
                        {(r.days || []).map((d) => (
                          <span
                            key={d.dayLabel}
                            className="bg-white/[0.04] text-[11px] px-2.5 py-1 rounded-lg flex items-center gap-1 border border-white/[0.06] text-zinc-300 font-semibold"
                          >
                            <LuCalendar className="w-3 h-3 text-lime-400" />
                            <span>{d.dayLabel}</span>
                          </span>
                        ))}
                      </div>

                      {/* Muscle Groups Covered */}
                      {muscleGroups.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {muscleGroups.slice(0, 4).map((mg) => (
                            <span
                              key={mg}
                              className="bg-lime-400/10 text-lime-400 text-[10px] px-2 py-0.5 rounded-md capitalize font-bold border border-lime-400/20"
                            >
                              {mg}
                            </span>
                          ))}
                          {muscleGroups.length > 4 && (
                            <span className="text-[10px] font-bold text-zinc-500 self-center">
                              +{muscleGroups.length - 4} más
                            </span>
                          )}
                        </div>
                      )}

                      {/* Empty Routine Warning */}
                      {exCount === 0 && (
                        <p className="text-xs text-amber-400/90 flex items-center gap-1.5 bg-amber-500/10 px-3 py-2 rounded-xl border border-amber-500/20 font-medium">
                          <LuTriangleAlert className="w-4 h-4 shrink-0" />
                          <span>Sin ejercicios — toca para agregar</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom Telemetry & Primary Action Footer */}
                  <div className="px-5 pb-5 pt-3 border-t border-white/[0.06] space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      {/* Exercises Count */}
                      <div className="flex items-center gap-1.5">
                        <LuTarget className="w-3.5 h-3.5 text-lime-400" />
                        <span className="font-black text-white">{exCount}</span>
                        <span className="text-zinc-500 text-[11px] font-semibold">
                          {exCount === 1 ? 'ejercicio' : 'ejercicios'}
                        </span>
                      </div>

                      {/* Estimated Duration */}
                      {exCount > 0 && (
                        <div className="flex items-center gap-1.5 text-zinc-400 font-medium">
                          <LuTimer className="w-3.5 h-3.5 text-cyan-400" />
                          <span>~{formatDuration(duration)}</span>
                        </div>
                      )}
                    </div>

                    {/* Touch-Friendly Primary CTA (>= 44px) */}
                    <div className="min-h-[44px] px-4 rounded-xl bg-white/[0.04] group-hover:bg-lime-400 border border-white/[0.08] group-hover:border-lime-400 flex items-center justify-between text-xs font-black uppercase tracking-wider text-zinc-300 group-hover:text-black transition-all duration-200">
                      <span>Ver Rutina & Entrenar</span>
                      <LuArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>

                </Link>
              );
            })}
          </div>
        )}

      </main>
    </div>
  );
}
