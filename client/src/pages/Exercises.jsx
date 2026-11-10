import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { exerciseThumb } from '../components/exercises/exerciseImages';
import { ExerciseThumb } from '../components/exercises/ExerciseMedia';
import Pagination from '../components/exercises/Pagination';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  LuSearch, LuDumbbell, LuArrowRight, LuZap, LuFlame,
  LuShield, LuHeart, LuActivity, LuTarget, LuTrendingUp, LuX,
  LuCheck, LuFilter, LuSparkles, LuSend, LuBrain, LuLoader,
  LuLightbulb, LuChevronDown, LuChevronUp, LuChevronLeft, LuChevronRight,
  LuLayoutGrid, LuList, LuSlidersHorizontal, LuPlus, LuUser,
} from 'react-icons/lu';

/* ─── helpers ─── */
function cleanExerciseName(rawName) {
  if (!rawName) return '';
  let name = rawName;
  // Remove PDF pagination/split markers like "- 2 of 6 --", "- 1 of 4 -", "Page 2 of 6"
  name = name.replace(/-?\s*\d+\s+of\s+\d+\s*-*/gi, '');
  name = name.replace(/\bpage\s*\d+(\s*of\s*\d+)?\b/gi, '');
  // Remove repetitive dashes/spaces at start/end
  name = name.replace(/^[-–—\s]+|[-–—\s]+$/g, '');
  // Normalize double spaces
  name = name.replace(/\s{2,}/g, ' ');
  return name.trim();
}

/* ─── muscle-group config ─── */
const MUSCLE_GROUPS = [
  { v: 'chest', l: 'Pecho', icon: <LuShield className="w-3.5 h-3.5" />, emoji: '💪' },
  { v: 'back', l: 'Espalda', icon: <LuActivity className="w-3.5 h-3.5" />, emoji: '🏋️' },
  { v: 'shoulders', l: 'Hombros', icon: <LuTarget className="w-3.5 h-3.5" />, emoji: '🎯' },
  { v: 'biceps', l: 'Bíceps', icon: <LuDumbbell className="w-3.5 h-3.5" />, emoji: '💪' },
  { v: 'triceps', l: 'Tríceps', icon: <LuDumbbell className="w-3.5 h-3.5" />, emoji: '🔥' },
  { v: 'legs', l: 'Piernas', icon: <LuZap className="w-3.5 h-3.5" />, emoji: '🦵' },
  { v: 'glutes', l: 'Glúteos', icon: <LuTrendingUp className="w-3.5 h-3.5" />, emoji: '🍑' },
  { v: 'abs', l: 'Abdominales', icon: <LuFlame className="w-3.5 h-3.5" />, emoji: '🔥' },
  { v: 'forearms', l: 'Antebrazos', icon: <LuDumbbell className="w-3.5 h-3.5" />, emoji: '✊' },
  { v: 'calves', l: 'Pantorrillas', icon: <LuZap className="w-3.5 h-3.5" />, emoji: '🦵' },
  { v: 'full_body', l: 'Cuerpo completo', icon: <LuHeart className="w-3.5 h-3.5" />, emoji: '⚡' },
  { v: 'cardio', l: 'Cardio', icon: <LuActivity className="w-3.5 h-3.5" />, emoji: '❤️' },
];

const EQUIPMENT_FILTERS = [
  { v: 'all', l: 'Todo el equipo' },
  { v: 'dumbbell', l: 'Mancuernas' },
  { v: 'barbell', l: 'Barra' },
  { v: 'cable', l: 'Polea / Cable' },
  { v: 'machine', l: 'Máquinas' },
  { v: 'bodyweight', l: 'Peso Corporal' },
];

const DIFFICULTY_CONFIG = {
  beginner: { label: 'Principiante', text: 'text-emerald-400', bg: 'bg-emerald-500/15', dot: 'bg-emerald-400' },
  intermediate: { label: 'Intermedio', text: 'text-amber-400', bg: 'bg-amber-500/15', dot: 'bg-amber-400' },
  advanced: { label: 'Avanzado', text: 'text-rose-400', bg: 'bg-rose-500/15', dot: 'bg-rose-400' },
};

const EQUIPMENT_LABELS = {
  barbell: 'Barra', dumbbell: 'Mancuerna', machine: 'Máquina', cable: 'Cable',
  bodyweight: 'Peso corporal', kettlebell: 'Kettlebell', band: 'Banda', other: 'Otro',
};

function getEquipmentIcon(eq, className = 'w-6 h-6') {
  switch (eq) {
    case 'dumbbell':
      return <LuDumbbell className={`${className} text-lime-400`} />;
    case 'barbell':
      return <LuZap className={`${className} text-amber-400`} />;
    case 'cable':
      return <LuActivity className={`${className} text-cyan-400`} />;
    case 'machine':
      return <LuSlidersHorizontal className={`${className} text-violet-400`} />;
    case 'bodyweight':
      return <LuUser className={`${className} text-emerald-400`} />;
    case 'kettlebell':
      return <LuFlame className={`${className} text-orange-400`} />;
    default:
      return <LuDumbbell className={`${className} text-zinc-300`} />;
  }
}

const QUICK_PROMPTS = [
  '¿Qué ejercicios me ayudan a ganar masa muscular en el pecho?',
  'Quiero quemar grasa y tonificar abdomen, ¿qué me recomiendas?',
  'Ejercicios para corregir y mejorar postura',
  'Rutina para piernas sin pesas (peso corporal)',
  '¿Cómo fortalecer la espalda baja y lumbar?',
];

/* ─── Compact Collapsible AI Advisor ─── */
function AiAdvisor({ allExercises }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [open, setOpen] = useState(false);

  const ask = async (q) => {
    const text = q || query;
    if (!text.trim()) return;
    setLoading(true);
    setResult(null);
    setOpen(true);
    try {
      const { data } = await api.post('/exercises/ai-recommend', { query: text });
      setResult(data);
      if (q) setQuery(q);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al consultar la IA');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-violet-500/25 hover:border-violet-500/40 rounded-2xl p-4 shadow-xl transition-all duration-200">
      {/* Compact Interactive Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400 shrink-0 shadow-sm">
            <LuBrain className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-500/15 text-violet-300 border border-violet-500/30 text-[11px] font-bold uppercase tracking-wider">
                <LuSparkles className="w-3 h-3 text-violet-400" /> Asesor IA Gemini
              </span>
              {result && (
                <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
              )}
            </div>
            <p className="text-xs text-zinc-400 truncate mt-0.5">
              {open ? 'Escribe tu objetivo o selecciona una consulta rápida' : 'Pregúntale a la IA qué ejercicios necesitas para tus metas'}
            </p>
          </div>
        </div>

        {/* Toggle Button */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="px-3.5 py-2 rounded-xl bg-violet-500/15 hover:bg-violet-500/25 text-violet-300 border border-violet-500/30 text-xs font-bold transition flex items-center gap-1.5 shrink-0"
        >
          <span>{open ? 'Ocultar' : 'Consultar'}</span>
          <LuChevronDown className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Expandable Body */}
      {open && (
        <div className="mt-4 pt-4 border-t border-white/10 space-y-4 animate-fadeIn">
          {/* Query Input */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <LuSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && ask()}
                placeholder="Ej: quiero ganar fuerza en hombros con mancuernas…"
                className="w-full bg-zinc-950 border border-violet-500/30 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition"
              />
            </div>
            <button
              type="button"
              onClick={() => ask()}
              disabled={loading || !query.trim()}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white transition active:scale-95 shadow-md shadow-violet-600/20 shrink-0"
            >
              {loading ? <LuLoader className="w-4 h-4 animate-spin" /> : <LuSend className="w-4 h-4" />}
              <span>{loading ? 'Pensando…' : 'Preguntar'}</span>
            </button>
          </div>

          {/* Quick Prompts Chips */}
          {!result && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Consultas sugeridas:</p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => ask(p)}
                    disabled={loading}
                    className="text-xs px-3 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-violet-500/20 text-zinc-300 hover:text-violet-200 border border-white/10 hover:border-violet-500/30 transition disabled:opacity-50"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Results Display */}
          {result && (
            <div className="space-y-4 pt-1 animate-fadeIn">
              {/* Advice Box */}
              <div className="flex gap-3 bg-violet-950/40 border border-violet-500/30 rounded-2xl p-4 shadow-inner">
                <LuLightbulb className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
                <p className="text-sm text-violet-100 leading-relaxed font-medium">{result.advice}</p>
              </div>

              {/* Catalog Matches */}
              {result.catalogMatches?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-violet-300 uppercase tracking-wider flex items-center gap-1.5">
                    <LuCheck className="w-3.5 h-3.5 text-lime-400" /> Disponibles en tu catálogo ({result.catalogMatches.length})
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {result.catalogMatches.map((ex) => {
                      const diff = DIFFICULTY_CONFIG[ex.difficulty] || DIFFICULTY_CONFIG.intermediate;
                      const muscleLabel = MUSCLE_GROUPS.find(mg => mg.v === ex.muscleGroup)?.l || ex.muscleGroup;
                      const cleanName = cleanExerciseName(ex.name);
                      return (
                        <Link
                          key={ex._id}
                          to={`/exercises/${ex._id}`}
                          className="flex items-center gap-3 bg-zinc-950 hover:bg-zinc-800/80 border border-white/10 hover:border-violet-500/40 rounded-xl p-3 transition group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center shrink-0">
                            <LuDumbbell className="w-4 h-4 text-violet-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-white truncate group-hover:text-violet-300 transition">{cleanName}</p>
                            <p className="text-xs text-zinc-400">{muscleLabel} · <span className={diff.text}>{diff.label}</span></p>
                          </div>
                          <LuArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-violet-400 transition shrink-0" />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Extra AI Suggestions */}
              {result.extraSuggestions?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                    <LuSparkles className="w-3.5 h-3.5" /> Recomendados adicionales por IA
                  </p>
                  <div className="space-y-2">
                    {result.extraSuggestions.map((s, i) => (
                      <div key={i} className="bg-zinc-950 border border-purple-500/25 rounded-xl p-3 space-y-1">
                        <div className="flex items-center gap-2">
                          <LuZap className="w-4 h-4 text-purple-400 shrink-0" />
                          <p className="text-sm font-bold text-purple-200">{cleanExerciseName(s.name)}</p>
                          {s.muscleGroup && (
                            <span className="ml-auto text-[11px] bg-purple-500/20 text-purple-300 px-2.5 py-0.5 rounded-full font-semibold">{s.muscleGroup}</span>
                          )}
                        </div>
                        {s.description && <p className="text-xs text-zinc-300 pl-6 leading-relaxed">{s.description}</p>}
                        {s.reason && <p className="text-xs text-purple-300/80 pl-6 italic">{s.reason}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reset query button */}
              <button
                type="button"
                onClick={() => { setResult(null); setQuery(''); }}
                className="text-xs font-semibold text-zinc-400 hover:text-white transition flex items-center gap-1.5 pt-1"
              >
                <LuX className="w-3.5 h-3.5" /> Limpiar consulta de IA
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const PAGE_SIZE = 24; // 4 columns × 6 rows on desktop

export default function Exercises() {
  /* Filters, search and page live in the URL (?m=chest,back&eq=barbell&q=press&page=2):
     they survive opening an exercise and coming back, and links can be shared. */
  const [params, setParams] = useSearchParams();
  const selectedGroups = useMemo(() => (params.get('m') || '').split(',').filter(Boolean), [params]);
  const selectedEquipment = params.get('eq') || 'all';
  const search = params.get('q') || '';
  const page = Math.max(1, parseInt(params.get('page'), 10) || 1);
  const [searchInput, setSearchInput] = useState(search);

  // Changing a filter goes back to page 1; changing page keeps the filters.
  const updateParams = useCallback((patch) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(patch)) {
        const empty = v == null || v === '' || v === 'all' || (Array.isArray(v) && v.length === 0);
        if (empty) next.delete(k);
        else next.set(k, Array.isArray(v) ? v.join(',') : String(v));
      }
      next.delete('page');
      return next;
    }, { replace: true });
  }, [setParams]);
  const setSelectedGroups = useCallback(
    (v) => updateParams({ m: typeof v === 'function' ? v((params.get('m') || '').split(',').filter(Boolean)) : v }),
    [updateParams, params]
  );
  const setSelectedEquipment = useCallback((v) => updateParams({ eq: v }), [updateParams]);

  // Search is sent to the server a moment after typing stops.
  useEffect(() => {
    if (searchInput.trim() === search) return undefined;
    const t = setTimeout(() => updateParams({ q: searchInput.trim() }), 300);
    return () => clearTimeout(t);
  }, [searchInput, search, updateParams]);
  useEffect(() => { setSearchInput(search); }, [search]);

  const resultsRef = useRef(null);
  const goToPage = useCallback((p) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (p <= 1) next.delete('page');
      else next.set('page', String(p));
      return next;
    });
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [setParams]);

  // One page of the catalog from the server (never the whole catalog).
  const [data, setData] = useState({ items: [], total: 0, page: 1, totalPages: 1, limit: PAGE_SIZE });
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const exercises = data.items;
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [expandMuscles, setExpandMuscles] = useState(false); // Default to false for fluid horizontal carousel scroll

  // Carousel ref, drag & scroll detection
  const carouselRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftStartRef = useRef(0);
  const hasDraggedRef = useRef(false);

  const checkScroll = useCallback(() => {
    if (!carouselRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6);
  }, []);

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [checkScroll]);

  // Manejo de rueda de ratón en el carrusel: desliza horizontalmente SIN saltos verticales de la página
  useEffect(() => {
    const el = carouselRef.current;
    if (!el || expandMuscles) return;

    const handleWheel = (e) => {
      // Interceptar siempre que haya movimiento vertical o intencional para deslizar horizontalmente
      if (Math.abs(e.deltaY) > 0 || Math.abs(e.deltaX) > 0) {
        const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        const atStart = el.scrollLeft <= 0 && delta < 0;
        const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 && delta > 0;

        if (!atStart && !atEnd) {
          e.preventDefault();
          el.scrollLeft += delta;
          checkScroll();
        }
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [expandMuscles, checkScroll]);

  const scroll = (direction) => {
    if (!carouselRef.current) return;
    const offset = direction === 'left' ? -280 : 280;
    carouselRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    setTimeout(checkScroll, 320);
  };

  // Drag con el ratón (click y arrastrar para deslizar fluido en PC)
  const handleMouseDown = (e) => {
    const el = carouselRef.current;
    if (!el) return;
    isDraggingRef.current = true;
    startXRef.current = e.pageX - el.offsetLeft;
    scrollLeftStartRef.current = el.scrollLeft;
    hasDraggedRef.current = false;
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current) return;
    const el = carouselRef.current;
    if (!el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startXRef.current) * 1.3;
    if (Math.abs(walk) > 4) {
      hasDraggedRef.current = true;
    }
    el.scrollLeft = scrollLeftStartRef.current - walk;
    checkScroll();
  };

  const handleMouseUpOrLeave = () => {
    isDraggingRef.current = false;
    setTimeout(() => {
      hasDraggedRef.current = false;
    }, 60);
  };

  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    const query = { page, limit: PAGE_SIZE };
    if (selectedGroups.length > 0) query.muscleGroup = selectedGroups.join(',');
    if (selectedEquipment && selectedEquipment !== 'all') query.equipment = selectedEquipment;
    if (search) query.search = search;
    let alive = true;
    setStatus('loading');
    api
      .get('/exercises', { params: query })
      .then((r) => {
        if (!alive) return;
        setData(r.data);
        setStatus('ready');
        setTimeout(checkScroll, 100);
      })
      .catch(() => alive && setStatus('error'));
    return () => { alive = false; };
  }, [page, selectedGroups, selectedEquipment, search, checkScroll, reloadKey]);

  const toggleGroup = useCallback((v) => {
    setSelectedGroups((prev) =>
      prev.includes(v) ? prev.filter((g) => g !== v) : [...prev, v]
    );
  }, []);

  const clearFilters = () => {
    setSearchInput('');
    setParams({}, { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#08090D] text-zinc-100 pb-24 selection:bg-lime-400 selection:text-black">
      {/* ══════════ HERO BANNER ══════════ */}
      <div className="relative overflow-hidden border-b border-white/10">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=1400&q=80)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/75 to-[#08090D]" />
        <div className="absolute top-10 right-1/4 w-[450px] h-[300px] bg-lime-400/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-[350px] h-[200px] bg-cyan-400/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-4 pt-10 pb-12">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="px-2.5 py-1 rounded-md bg-lime-400/10 border border-lime-400/20 text-lime-400 text-xs font-bold uppercase tracking-wider">
                Biblioteca Técnica
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
              Catálogo de <span className="text-lime-400">Ejercicios</span>
            </h1>
            <p className="text-zinc-300 text-sm md:text-base mt-1 max-w-lg">
              Explora movimientos biomecánicos, videos demostrativos y guías de ejecución paso a paso.
            </p>
          </div>

          {/* Stats strip */}
          <div className="flex flex-wrap items-center gap-3 mt-5">
            <div className="flex items-center gap-2 bg-zinc-900 border border-white/10 px-4 py-2 rounded-xl shadow-md">
              <LuDumbbell className="w-4 h-4 text-lime-400" />
              <span className="text-sm font-black text-white font-mono">{status === 'loading' && !data.total ? '…' : data.total}</span>
              <span className="text-xs text-zinc-400">{selectedGroups.length || selectedEquipment !== 'all' || search ? 'ejercicios encontrados' : 'ejercicios disponibles'}</span>
            </div>

            {(selectedGroups.length > 0 || selectedEquipment !== 'all') && (
              <>
                <div className="flex items-center gap-2 bg-lime-400/15 border border-lime-400/30 px-3.5 py-2 rounded-xl">
                  <LuFilter className="w-3.5 h-3.5 text-lime-400" />
                  <span className="text-xs font-bold text-lime-400">
                    Filtros activos: {selectedGroups.length + (selectedEquipment !== 'all' ? 1 : 0)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-bold text-zinc-400 hover:text-red-400 transition flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-zinc-850"
                >
                  <LuX className="w-3.5 h-3.5" /> Limpiar filtros
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-6 space-y-5">
        {/* ══════════ ASESOR IA (COMPACTO Y COLAPSABLE) ══════════ */}
        <AiAdvisor allExercises={exercises} />

        {/* ══════════ BUSCADOR + FILTROS MUSCULARES Y EQUIPAMIENTO ══════════ */}
        <div data-tour="exercises-filters" className="space-y-3.5 bg-zinc-900/60 border border-white/[0.08] rounded-2xl p-4 shadow-xl">
          {/* Fila del buscador y Toggle de vista expandida */}
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <LuSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por nombre (ej: Press banca, Sentadilla)..."
                className="w-full bg-zinc-950 border border-white/10 rounded-xl pl-10 pr-9 py-2.5 text-sm font-semibold text-white placeholder-zinc-500 outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400/30 transition-all shadow-inner"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-1 rounded-lg transition"
                  title="Borrar búsqueda"
                >
                  <LuX className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Toggle discreto para expandir todos los músculos o mantener carrusel */}
            <button
              type="button"
              onClick={() => setExpandMuscles(!expandMuscles)}
              className={`text-xs font-bold transition flex items-center gap-1.5 px-3 py-2.5 rounded-xl border shrink-0 ${
                expandMuscles
                  ? 'bg-lime-400/10 text-lime-400 border-lime-400/30 hover:bg-lime-400/20'
                  : 'bg-zinc-950 text-zinc-400 hover:text-white border-white/10 hover:border-white/20'
              }`}
              title={expandMuscles ? 'Modo carrusel deslizante' : 'Ver todos los músculos en cuadrícula'}
            >
              {expandMuscles ? (
                <>
                  <LuChevronUp className="w-3.5 h-3.5 text-lime-400" />
                  <span className="hidden sm:inline">Modo carrusel</span>
                </>
              ) : (
                <>
                  <LuChevronDown className="w-3.5 h-3.5 text-lime-400" />
                  <span className="hidden sm:inline">Ver todos ({MUSCLE_GROUPS.length})</span>
                </>
              )}
            </button>
          </div>

          {/* Fila de Filtros Musculares: Carrusel deslizable o Cuadrícula expandida */}
          {expandMuscles ? (
            /* Modo Cuadrícula Expandida */
            <div className="flex flex-wrap gap-2 pt-1 animate-fadeIn">
              <button
                type="button"
                onClick={() => setSelectedGroups([])}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  selectedGroups.length === 0
                    ? 'bg-lime-400 text-zinc-950 shadow-md shadow-lime-400/20 scale-[1.02]'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-850 border border-white/10 font-semibold'
                }`}
              >
                <span>Todos los músculos</span>
              </button>

              {MUSCLE_GROUPS.map((mg) => {
                const isActive = selectedGroups.includes(mg.v);
                return (
                  <button
                    key={mg.v}
                    type="button"
                    onClick={() => toggleGroup(mg.v)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                      isActive
                        ? 'bg-lime-400 text-zinc-950 shadow-md shadow-lime-400/20 scale-[1.02]'
                        : 'bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-850 border border-white/10'
                    }`}
                  >
                    <span className="text-sm leading-none">{mg.emoji}</span>
                    <span>{mg.l}</span>
                    {isActive && (
                      <span className="w-4 h-4 rounded-full bg-zinc-950/20 flex items-center justify-center text-zinc-950">
                        <LuCheck className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            /* Modo Carrusel con Flechas Flotantes, Fade Mask, Drag y Wheel suave */
            <div className="relative group/carousel">
              {/* Botón flotante Izquierdo con degradado de desvanecimiento */}
              {canScrollLeft && (
                <div className="absolute left-0 top-0 bottom-0 z-20 flex items-center pr-6 bg-gradient-to-r from-zinc-900 via-zinc-900/95 to-transparent pointer-events-none">
                  <button
                    type="button"
                    onClick={() => scroll('left')}
                    className="pointer-events-auto w-8 h-8 rounded-full bg-zinc-800 hover:bg-lime-400 hover:text-zinc-950 text-white border border-white/15 shadow-xl shadow-black/60 flex items-center justify-center transition-all duration-200 active:scale-90"
                    title="Desplazar a la izquierda"
                  >
                    <LuChevronLeft className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              )}

              {/* Botón flotante Derecho con degradado de desvanecimiento */}
              {canScrollRight && (
                <div className="absolute right-0 top-0 bottom-0 z-20 flex items-center pl-6 bg-gradient-to-l from-zinc-900 via-zinc-900/95 to-transparent pointer-events-none">
                  <button
                    type="button"
                    onClick={() => scroll('right')}
                    className="pointer-events-auto w-8 h-8 rounded-full bg-zinc-800 hover:bg-lime-400 hover:text-zinc-950 text-white border border-white/15 shadow-xl shadow-black/60 flex items-center justify-center transition-all duration-200 active:scale-90"
                    title="Desplazar a la derecha"
                  >
                    <LuChevronRight className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              )}

              {/* Contenedor deslizable con soporte de arrastre con ratón */}
              <div
                ref={carouselRef}
                onScroll={checkScroll}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUpOrLeave}
                onMouseLeave={handleMouseUpOrLeave}
                className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full py-1 cursor-grab active:cursor-grabbing select-none"
              >
                <button
                  type="button"
                  onClick={() => {
                    if (hasDraggedRef.current) return;
                    setSelectedGroups([]);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all shrink-0 flex items-center gap-1.5 ${
                    selectedGroups.length === 0
                      ? 'bg-lime-400 text-zinc-950 shadow-md shadow-lime-400/20 scale-[1.02]'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-850 border border-white/10 font-semibold'
                  }`}
                >
                  <span>Todos los músculos</span>
                </button>

                {MUSCLE_GROUPS.map((mg) => {
                  const isActive = selectedGroups.includes(mg.v);
                  return (
                    <button
                      key={mg.v}
                      type="button"
                      onClick={() => {
                        if (hasDraggedRef.current) return;
                        toggleGroup(mg.v);
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
                        isActive
                          ? 'bg-lime-400 text-zinc-950 shadow-md shadow-lime-400/20 scale-[1.02]'
                          : 'bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-850 border border-white/10'
                      }`}
                    >
                      <span className="text-sm leading-none">{mg.emoji}</span>
                      <span>{mg.l}</span>
                      {isActive && (
                        <span className="w-4 h-4 rounded-full bg-zinc-950/20 flex items-center justify-center text-zinc-950">
                          <LuCheck className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Fila Secundaria: Filtro por Equipamiento (Barra compacta deslizable) */}
          <div className="flex items-center gap-2 pt-2 border-t border-white/5">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider shrink-0 flex items-center gap-1.5 pr-1">
              <LuSlidersHorizontal className="w-3.5 h-3.5 text-lime-400" /> EQUIPO:
            </span>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth w-full py-1">
              {EQUIPMENT_FILTERS.map((eq) => {
                const isActive = selectedEquipment === eq.v;
                return (
                  <button
                    key={eq.v}
                    type="button"
                    onClick={() => setSelectedEquipment(eq.v)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-zinc-200 text-zinc-950 font-bold shadow-sm scale-[1.02]'
                        : 'bg-zinc-900/90 text-zinc-400 hover:text-white hover:bg-zinc-850 border border-white/5 font-semibold'
                    }`}
                  >
                    {eq.l}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fila de estado: Contador de resultados y Selector de vista (Grid vs Lista) */}
          <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-white/10">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-semibold text-zinc-400">
                {status === 'loading' ? 'Buscando…' : <>Mostrando <strong className="text-white font-bold">{data.total ? `${(data.page - 1) * data.limit + 1}–${Math.min(data.total, data.page * data.limit)}` : 0}</strong> de <strong className="text-white font-bold">{data.total}</strong> ejercicios</>}
              </span>
              {(selectedGroups.length > 0 || selectedEquipment !== 'all' || search) && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-bold text-zinc-400 hover:text-red-400 transition-colors flex items-center gap-1 px-2 py-0.5 rounded-lg hover:bg-zinc-800"
                >
                  <LuX className="w-3.5 h-3.5" /> Limpiar filtros
                </button>
              )}
            </div>

            {/* Toggle de Visualización Grid vs Lista */}
            <div className="flex items-center gap-1 bg-zinc-950 border border-white/10 p-1 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-zinc-800 text-lime-400 shadow-sm'
                    : 'text-zinc-500 hover:text-white'
                }`}
                title="Vista en tarjetas"
              >
                <LuLayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-zinc-800 text-lime-400 shadow-sm'
                    : 'text-zinc-500 hover:text-white'
                }`}
                title="Vista en lista compacta"
              >
                <LuList className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ══════════ CATÁLOGO: VISTA EN GRID O EN LISTA ══════════ */}
        <div ref={resultsRef} className="scroll-mt-24" />
        {status === 'error' ? (
          <div className="text-center py-12 space-y-3 bg-zinc-900 border border-rose-500/20 rounded-2xl" role="alert">
            <p className="text-sm font-semibold text-white">No pudimos cargar los ejercicios</p>
            <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="text-xs font-bold text-lime-400 hover:text-lime-300">Reintentar</button>
          </div>
        ) : status === 'loading' && exercises.length === 0 ? (
          <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-busy="true" aria-label="Cargando ejercicios">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden">
                <div className="aspect-[16/10] bg-zinc-800/70 animate-pulse" />
                <div className="p-4 space-y-2"><div className="h-3 w-2/3 bg-zinc-800 rounded animate-pulse" /><div className="h-2.5 w-1/2 bg-zinc-800/70 rounded animate-pulse" /></div>
              </div>
            ))}
          </div>
        ) : exercises.length === 0 ? (
          <div className="text-center py-16 space-y-4 bg-zinc-900 border border-white/10 rounded-2xl">
            <div className="w-16 h-16 rounded-3xl bg-zinc-950 border border-white/10 flex items-center justify-center mx-auto text-zinc-500">
              <LuSearch className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">No se encontraron ejercicios</h3>
              <p className="text-zinc-400 text-xs sm:text-sm mt-1 max-w-sm mx-auto">
                Prueba ajustando el término de búsqueda o cambiando los filtros de músculos y equipamiento.
              </p>
            </div>
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-2 bg-lime-400 hover:bg-lime-300 text-zinc-950 px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow-lg shadow-lime-400/20 active:scale-95"
            >
              <LuX className="w-4 h-4 stroke-[2.5]" /> Limpiar filtros
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* ── VISTA DE TARJETAS (GRID) ── */
          <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-fadeIn">
            {exercises.map((ex) => {
              const diff = DIFFICULTY_CONFIG[ex.difficulty] || DIFFICULTY_CONFIG.intermediate;
              const muscleObj = MUSCLE_GROUPS.find((mg) => mg.v === ex.muscleGroup);
              const muscleLabel = muscleObj?.l || ex.muscleGroup;
              const muscleEmoji = muscleObj?.emoji || '💪';
              const equipLabel = EQUIPMENT_LABELS[ex.equipment] || ex.equipment;
              const cleanName = cleanExerciseName(ex.name);
              const imgSrc = exerciseThumb(ex);

              return (
                <Link
                  to={`/exercises/${ex._id}`}
                  key={ex._id}
                  className="group bg-zinc-900 border border-white/10 hover:border-lime-400/40 rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-lime-400/5 flex flex-col"
                >
                  {/* Media Thumbnail con CDN real y fallback consistente */}
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-zinc-950">
                    <ExerciseThumb
                      src={imgSrc}
                      alt={cleanName}
                      className="w-full h-full transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent pointer-events-none" />

                    {/* Difficulty Badge (Top Right) */}
                    <div className="absolute top-2.5 right-2.5 z-20">
                      <span className={`inline-flex items-center gap-1 ${diff.bg} backdrop-blur-md px-2.5 py-0.5 rounded-lg text-[10px] font-bold ${diff.text} border border-white/10 shadow-sm uppercase tracking-wider`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${diff.dot}`} />
                        {diff.label}
                      </span>
                    </div>

                    {/* Muscle Group Badge (Bottom Left) */}
                    <div className="absolute bottom-2.5 left-2.5 z-20">
                      <span className="inline-flex items-center gap-1.5 bg-zinc-900/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-bold text-white border border-white/15 shadow-sm">
                        <span className="text-xs leading-none">{muscleEmoji}</span>
                        {muscleLabel}
                      </span>
                    </div>

                    {/* Floating Action Button (Bottom Right) */}
                    <div className="absolute bottom-2.5 right-2.5 z-20 w-8 h-8 rounded-xl bg-lime-400 text-zinc-950 flex items-center justify-center shadow-lg shadow-lime-400/25 group-hover:scale-110 transition-all duration-200">
                      <LuArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h3 className="font-bold text-sm sm:text-base text-white leading-snug group-hover:text-lime-400 transition-colors line-clamp-1">
                        {cleanName}
                      </h3>
                      {ex.description && (
                        <p className="text-xs text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                          {ex.description}
                        </p>
                      )}
                    </div>

                    {/* Metadata Tags con alto contraste */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-200 text-xs font-bold border border-white/10 shadow-sm">
                        <LuDumbbell className="w-3 h-3 text-lime-400" />
                        {equipLabel}
                      </span>
                      {ex.secondaryMuscles?.length > 0 && (
                        <span className="inline-flex items-center gap-1 bg-zinc-800/60 text-zinc-400 px-2 py-0.5 rounded-md text-[11px] font-medium border border-white/5">
                          +{ex.secondaryMuscles.length} sec.
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          /* ── VISTA DE LISTA COMPACTA (Filas atléticas de 56px estilo Hevy/Strong) ── */
          <div className="space-y-2 animate-fadeIn">
            {exercises.map((ex) => {
              const diff = DIFFICULTY_CONFIG[ex.difficulty] || DIFFICULTY_CONFIG.intermediate;
              const muscleObj = MUSCLE_GROUPS.find((mg) => mg.v === ex.muscleGroup);
              const muscleLabel = muscleObj?.l || ex.muscleGroup;
              const equipLabel = EQUIPMENT_LABELS[ex.equipment] || ex.equipment;
              const cleanName = cleanExerciseName(ex.name);
              const imgSrc = exerciseThumb(ex);

              return (
                <Link
                  to={`/exercises/${ex._id}`}
                  key={ex._id}
                  className="group bg-zinc-900/80 hover:bg-zinc-850 border border-white/5 hover:border-lime-400/40 rounded-xl px-3.5 py-2 h-14 flex items-center justify-between gap-3.5 transition-all duration-200 shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Thumbnail pequeño de 40px (w-10 h-10) con imagen real/ilustración */}
                    <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-zinc-950 shrink-0 border border-white/10">
                      <ExerciseThumb src={imgSrc} alt={cleanName} size="sm" className="w-full h-full" />
                    </div>

                    {/* Información: Nombre en blanco + badges de músculo y equipo */}
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-white group-hover:text-lime-400 transition-colors truncate">
                        {cleanName}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-lime-400 font-semibold">
                          {muscleLabel}
                        </span>
                        <span className="text-zinc-600 text-xs">•</span>
                        <span className="text-xs text-zinc-400 font-medium">
                          {equipLabel}
                        </span>
                        <span className={`hidden sm:inline-flex items-center gap-1 text-[10px] font-bold ${diff.text} ml-1`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${diff.dot}`} />
                          {diff.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Botón "+" a la derecha estilo Hevy / Strong */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="w-8 h-8 rounded-xl bg-zinc-800/90 group-hover:bg-lime-400 text-zinc-400 group-hover:text-zinc-950 flex items-center justify-center transition-all duration-200 shadow-sm">
                      <LuPlus className="w-4 h-4 stroke-[3]" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {status === 'ready' && (
          <div className="pt-2">
            <Pagination page={data.page} totalPages={data.totalPages} total={data.total} limit={data.limit} onChange={goToPage} />
          </div>
        )}

        {/* Credit for the open catalog the exercises were imported from (CC-BY-SA requires it). */}
        {exercises.some((e) => e.source?.provider === 'wger') && (
          <p className="text-[11px] text-zinc-500 text-center pt-6">
            Parte de los ejercicios procede de{' '}
            <a href="https://wger.de" target="_blank" rel="noopener noreferrer" className="underline hover:text-zinc-300">wger.de</a>
            {' '}(licencia{' '}
            <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.es" target="_blank" rel="noopener noreferrer" className="underline hover:text-zinc-300">CC BY-SA</a>
            ); los autores aparecen en cada ejercicio.
          </p>
        )}
      </div>
    </div>
  );
}
