import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import {
  LuSearch, LuDumbbell, LuArrowRight, LuZap, LuFlame, LuStar,
  LuShield, LuHeart, LuActivity, LuTarget, LuTrendingUp, LuX,
  LuCheck, LuFilter, LuSparkles, LuBot, LuSend, LuLoader, LuPlus,
} from 'react-icons/lu';

/* ─── muscle-group config ─── */
const MUSCLE_GROUPS = [
  { v: 'chest',      l: 'Pecho',           icon: <LuShield className="w-4 h-4" />,   emoji: '💪' },
  { v: 'back',       l: 'Espalda',         icon: <LuActivity className="w-4 h-4" />,  emoji: '🏋️' },
  { v: 'shoulders',  l: 'Hombros',         icon: <LuTarget className="w-4 h-4" />,    emoji: '🎯' },
  { v: 'biceps',     l: 'Bíceps',          icon: <LuDumbbell className="w-4 h-4" />,  emoji: '💪' },
  { v: 'triceps',    l: 'Tríceps',         icon: <LuDumbbell className="w-4 h-4" />,  emoji: '🔥' },
  { v: 'legs',       l: 'Piernas',         icon: <LuZap className="w-4 h-4" />,       emoji: '🦵' },
  { v: 'glutes',     l: 'Glúteos',         icon: <LuTrendingUp className="w-4 h-4" />,emoji: '🍑' },
  { v: 'abs',        l: 'Abdominales',     icon: <LuFlame className="w-4 h-4" />,     emoji: '🔥' },
  { v: 'forearms',   l: 'Antebrazos',      icon: <LuDumbbell className="w-4 h-4" />,  emoji: '✊' },
  { v: 'calves',     l: 'Pantorrillas',    icon: <LuZap className="w-4 h-4" />,       emoji: '🦵' },
  { v: 'full_body',  l: 'Cuerpo completo', icon: <LuHeart className="w-4 h-4" />,     emoji: '⚡' },
  { v: 'cardio',     l: 'Cardio',          icon: <LuActivity className="w-4 h-4" />,  emoji: '❤️' },
];

const DIFFICULTY_CONFIG = {
  beginner:     { label: 'Principiante', text: 'text-emerald-400', bg: 'bg-emerald-500/15', dot: 'bg-emerald-400' },
  intermediate: { label: 'Intermedio',   text: 'text-amber-400',   bg: 'bg-amber-500/15',   dot: 'bg-amber-400' },
  advanced:     { label: 'Avanzado',     text: 'text-red-400',     bg: 'bg-red-500/15',     dot: 'bg-red-400' },
};

const EQUIPMENT_LABELS = {
  barbell: 'Barra', dumbbell: 'Mancuerna', machine: 'Máquina', cable: 'Cable',
  bodyweight: 'Peso corporal', kettlebell: 'Kettlebell', band: 'Banda', other: 'Otro',
};

/* Each muscle group gets its own Unsplash preview + gradient overlay */
const MUSCLE_IMAGE = {
  chest:     'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80',
  back:      'https://images.unsplash.com/photo-1603287681836-b174ce5074c2?w=400&q=80',
  shoulders: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&q=80',
  biceps:    'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&q=80',
  triceps:   'https://images.unsplash.com/photo-1530822847156-5df684ec5ee1?w=400&q=80',
  legs:      'https://images.unsplash.com/photo-1434608519344-49d77a699e1d?w=400&q=80',
  glutes:    'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400&q=80',
  abs:       'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80',
  forearms:  'https://images.unsplash.com/photo-1534368959876-26bf04f2c947?w=400&q=80',
  calves:    'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=400&q=80',
  full_body: 'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=400&q=80',
  cardio:    'https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=400&q=80',
};

const MUSCLE_GRADIENT = {
  chest:     'from-red-600/90 to-rose-800/90',
  back:      'from-blue-600/90 to-indigo-800/90',
  shoulders: 'from-orange-600/90 to-amber-800/90',
  biceps:    'from-purple-600/90 to-violet-800/90',
  triceps:   'from-fuchsia-600/90 to-pink-800/90',
  legs:      'from-emerald-600/90 to-green-800/90',
  glutes:    'from-pink-600/90 to-rose-800/90',
  abs:       'from-cyan-600/90 to-teal-800/90',
  forearms:  'from-indigo-600/90 to-blue-800/90',
  calves:    'from-teal-600/90 to-cyan-800/90',
  full_body: 'from-amber-600/90 to-yellow-800/90',
  cardio:    'from-rose-600/90 to-red-800/90',
};

const MUSCLE_FILTER_GRADIENT = {
  chest: 'from-red-500 to-rose-600',       back: 'from-blue-500 to-indigo-600',
  shoulders: 'from-orange-500 to-amber-600', biceps: 'from-purple-500 to-violet-600',
  triceps: 'from-fuchsia-500 to-pink-600',  legs: 'from-emerald-500 to-green-600',
  glutes: 'from-pink-500 to-rose-600',      abs: 'from-cyan-500 to-teal-600',
  forearms: 'from-indigo-500 to-blue-600',  calves: 'from-teal-500 to-cyan-600',
  full_body: 'from-amber-500 to-yellow-600', cardio: 'from-rose-500 to-red-600',
};

const normalizeSearchText = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const MUSCLE_SEARCH_ALIASES = {
  chest: ['chest', 'pecho', 'pectoral', 'pectorales'],
  back: ['back', 'espalda', 'dorsal', 'dorsales'],
  shoulders: ['shoulders', 'shoulder', 'hombro', 'hombros', 'deltoide', 'deltoides'],
  biceps: ['biceps', 'bicep', 'brazo', 'brazos'],
  triceps: ['triceps', 'tricep'],
  legs: ['legs', 'pierna', 'piernas', 'cuadriceps', 'femoral', 'muslo', 'muslos'],
  glutes: ['glutes', 'gluteo', 'gluteos', 'pompa', 'pompas'],
  abs: ['abs', 'abdomen', 'abdominal', 'abdominales', 'core'],
  forearms: ['forearms', 'antebrazo', 'antebrazos'],
  calves: ['calves', 'pantorrilla', 'pantorrillas', 'gemelo', 'gemelos'],
  full_body: ['full body', 'cuerpo completo', 'cuerpo'],
  cardio: ['cardio', 'aerobico', 'aerobicos', 'hiit'],
};

export default function Exercises() {
  const { user } = useAuth();
  const [exercises, setExercises] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);   // multi-select
  const [search, setSearch] = useState('');
  const [aiQuery, setAiQuery] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [routines, setRoutines] = useState([]);
  const [savingRecIdx, setSavingRecIdx] = useState(null);
  const [addModal, setAddModal] = useState({
    open: false,
    idx: null,
    routineId: '',
    dayIndex: 0,
  });

  const getApiError = (err, fallback = 'Error') =>
    err?.response?.data?.message || err?.message || fallback;
  const parseNumber = (value, fallback) => {
    const n = Number(String(value || '').match(/\d+/)?.[0]);
    return Number.isFinite(n) ? n : fallback;
  };
  const parseReps = (value) => {
    const m = String(value || '').match(/(\d+)\s*[-x]\s*(\d+)/);
    if (m) return { repsMin: Number(m[1]), repsMax: Number(m[2]) };
    const n = parseNumber(value, 10);
    return { repsMin: n, repsMax: n };
  };

  useEffect(() => {
    const params = {};
    const normalizedSearch = normalizeSearchText(search);
    const searchMatchedGroups = Object.entries(MUSCLE_SEARCH_ALIASES)
      .filter(([, aliases]) =>
        normalizedSearch
        && aliases.some((alias) => {
          const normalizedAlias = normalizeSearchText(alias);
          return normalizedAlias.includes(normalizedSearch) || normalizedSearch.includes(normalizedAlias);
        }))
      .map(([group]) => group);

    const combinedGroups = [...new Set([...selectedGroups, ...searchMatchedGroups])];

    if (combinedGroups.length > 0) params.muscleGroup = combinedGroups.join(',');
    if (search) params.search = search;
    api
      .get('/exercises', { params })
      .then((r) => setExercises(r.data))
      .catch((err) => {
        setExercises([]);
        toast.error(getApiError(err, 'No se pudieron cargar los ejercicios'));
      });
  }, [selectedGroups, search]);

  useEffect(() => {
    if (!user) {
      setRoutines([]);
      return;
    }
    api
      .get('/routines')
      .then((r) => setRoutines(r.data || []))
      .catch(() => setRoutines([]));
  }, [user]);

  const toggleGroup = useCallback((v) => {
    setSelectedGroups((prev) =>
      prev.includes(v) ? prev.filter((g) => g !== v) : [...prev, v]
    );
  }, []);

  const clearFilters = () => { setSelectedGroups([]); setSearch(''); };
  const askExerciseAI = async () => {
    if (!aiQuery.trim()) {
      toast.error('Escribe que tipo de ejercicios buscas');
      return;
    }
    setAiLoading(true);
    try {
      const { data } = await api.post('/exercises/ai-suggest-open', {
        query: aiQuery.trim(),
      });
      setAiResult(data);
    } catch (err) {
      toast.error(getApiError(err, 'No se pudieron obtener sugerencias'));
    } finally {
      setAiLoading(false);
    }
  };
  const updateRecommendation = (idx, patch) => {
    setAiResult((prev) => {
      if (!prev?.recommendations) return prev;
      const next = [...prev.recommendations];
      next[idx] = { ...next[idx], ...patch };
      return { ...prev, recommendations: next };
    });
  };
  const saveRecommendationToCatalog = async (rec, idx) => {
    if (!user) {
      toast.error('Debes iniciar sesion para guardar en catalogo');
      return null;
    }
    if (rec.exerciseId) return rec.exerciseId;

    try {
      setSavingRecIdx(`catalog-${idx}`);
      const { data } = await api.post('/exercises/custom', {
        name: rec.name,
        description: rec.reason || 'Ejercicio agregado desde sugerencia IA',
        muscleGroup: rec.muscleGroup,
        equipment: rec.equipment,
        difficulty: rec.difficulty,
        category: 'hypertrophy',
      });
      const exId = data?.exercise?._id;
      if (exId) {
        updateRecommendation(idx, {
          exerciseId: exId,
          catalogSaved: true,
        });
        toast.success(data?.created ? 'Ejercicio agregado al catalogo' : 'Ejercicio ya existia en catalogo');
        return exId;
      }
      toast.error('No se pudo guardar el ejercicio');
      return null;
    } catch (err) {
      toast.error(getApiError(err, 'No se pudo guardar en catalogo'));
      return null;
    } finally {
      setSavingRecIdx(null);
    }
  };
  const openAddToRoutine = (idx) => {
    if (!user) {
      toast.error('Debes iniciar sesion para agregar a una rutina');
      return;
    }
    if (!routines.length) {
      toast.error('Primero crea una rutina');
      return;
    }
    setAddModal({
      open: true,
      idx,
      routineId: routines[0]._id,
      dayIndex: 0,
    });
  };
  const submitAddToRoutine = async () => {
    const idx = addModal.idx;
    const rec = aiResult?.recommendations?.[idx];
    if (!rec) return;

    const exerciseId = rec.exerciseId
      ? rec.exerciseId
      : await saveRecommendationToCatalog(rec, idx);
    if (!exerciseId) return;

    const reps = parseReps(rec.reps);
    try {
      setSavingRecIdx(`routine-${idx}`);
      await api.post(`/routines/${addModal.routineId}/add-exercise`, {
        exerciseId,
        dayIndex: addModal.dayIndex,
        sets: parseNumber(rec.sets, 3),
        repsMin: reps.repsMin,
        repsMax: reps.repsMax,
        notes: `Agregado desde IA: ${rec.name}`,
      });
      toast.success('Ejercicio agregado a la rutina');
      setAddModal({ open: false, idx: null, routineId: '', dayIndex: 0 });
    } catch (err) {
      toast.error(getApiError(err, 'No se pudo agregar a la rutina'));
    } finally {
      setSavingRecIdx(null);
    }
  };

  const activeLabels = selectedGroups.map(g => MUSCLE_GROUPS.find(mg => mg.v === g)?.l).filter(Boolean);
  const selectedRoutine = routines.find((r) => r._id === addModal.routineId) || null;
  const selectedRecommendation = aiResult?.recommendations?.[addModal.idx] || null;

  return (
    <div className="min-h-screen pb-12">
      {/* ══════════ HERO BANNER ══════════ */}
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=1400&q=80)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-dark/80 via-dark/70 to-dark" />
        <div className="absolute top-10 right-1/4 w-[400px] h-[300px] bg-primary/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[350px] h-[200px] bg-accent/10 rounded-full blur-[100px]" />

        <div className="relative max-w-6xl mx-auto px-4 pt-12 pb-14">
          <div className="animate-fadeInUp">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-lg shadow-primary/25">
                <LuDumbbell className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                  Catálogo de <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-indigo-400 to-accent">Ejercicios</span>
                </h1>
                <p className="text-gray-400 text-sm">Encuentra el ejercicio perfecto para tu entrenamiento</p>
              </div>
            </div>
          </div>

          {/* Stats strip */}
          <div className="animate-fadeInUp stagger-1 flex flex-wrap items-center gap-3 mt-6">
            <div className="flex items-center gap-2 bg-slate-800/60 backdrop-blur-sm px-4 py-2 rounded-xl border border-slate-700/50">
              <LuDumbbell className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-white">{exercises.length}</span>
              <span className="text-xs text-gray-400">ejercicios</span>
            </div>
            {selectedGroups.length > 0 && (
              <>
                <div className="flex items-center gap-2 bg-primary/15 backdrop-blur-sm px-4 py-2 rounded-xl border border-primary/30">
                  <LuFilter className="w-4 h-4 text-primary" />
                  <span className="text-sm font-bold text-primary">{selectedGroups.length} filtro{selectedGroups.length > 1 ? 's' : ''}</span>
                </div>
                {activeLabels.map((label) => (
                  <span key={label} className="bg-slate-700/60 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-300 border border-slate-600/40">
                    {label}
                  </span>
                ))}
                <button onClick={clearFilters} className="text-xs text-gray-500 hover:text-red-400 transition flex items-center gap-1">
                  <LuX className="w-3.5 h-3.5" /> Limpiar
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-6 space-y-6">
        {/* ══════════ SEARCH + FILTERS ══════════ */}
        <div data-tour="exercises-filters" className="animate-fadeInUp stagger-2 space-y-5">
          {/* Search bar */}
          <div className="relative max-w-md">
            <LuSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              placeholder="Buscar ejercicio…"
              className="w-full bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl pl-12 pr-4 py-3 outline-none text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all placeholder-gray-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition"
              >
                <LuX className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Multi-select muscle group pills */}
          <div>
            <p className="text-xs text-gray-500 mb-2 flex items-center gap-1.5">
              <LuSparkles className="w-3.5 h-3.5 text-primary" /> Selecciona uno o varios grupos musculares
            </p>
            <div className="flex flex-wrap gap-2">
              {MUSCLE_GROUPS.map((mg) => {
                const isActive = selectedGroups.includes(mg.v);
                const grad = MUSCLE_FILTER_GRADIENT[mg.v];
                return (
                  <button
                    key={mg.v}
                    onClick={() => toggleGroup(mg.v)}
                    className={`group/pill flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                      isActive
                        ? `bg-gradient-to-r ${grad} text-white shadow-lg shadow-primary/20 scale-[1.03]`
                        : 'bg-slate-800/80 text-gray-400 border border-slate-700/50 hover:border-slate-500/70 hover:text-white hover:bg-slate-700/80'
                    }`}
                  >
                    {isActive ? (
                      <span className="w-4 h-4 bg-white/25 rounded-md flex items-center justify-center">
                        <LuCheck className="w-3 h-3" />
                      </span>
                    ) : (
                      mg.icon
                    )}
                    {mg.l}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ══════════ AI SUGGESTIONS ══════════ */}
        <div className="animate-fadeInUp bg-slate-800/60 backdrop-blur-sm rounded-2xl p-5 border border-slate-700/50 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <LuBot className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <p className="font-bold text-sm text-white">Sugerencias con IA</p>
              <p className="text-xs text-gray-400">Puede recomendar ejercicios del catalogo y tambien externos</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && askExerciseAI()}
              placeholder="Ej: Quiero ejercicios para gluteos sin impacto en rodilla"
              className="flex-1 bg-slate-900/70 border border-slate-700/50 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-500/40"
            />
            <button
              onClick={askExerciseAI}
              disabled={aiLoading}
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-indigo-600 hover:to-violet-600 px-4 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-60"
            >
              {aiLoading ? <LuLoader className="w-4 h-4 animate-spin" /> : <LuSend className="w-4 h-4" />}
              {aiLoading ? 'Pensando...' : 'Pedir sugerencias'}
            </button>
          </div>

          {aiResult?.recommendations?.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white">{aiResult.title || 'Sugerencias IA'}</h3>
                  <p className="text-xs text-gray-400 mt-1">{aiResult.explanation}</p>
                </div>
                <span className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-700/60 text-gray-300">
                  fuente: {aiResult.source || 'ai'}
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                {aiResult.recommendations.map((rec, idx) => {
                  const muscleLabel = MUSCLE_GROUPS.find((mg) => mg.v === rec.muscleGroup)?.l || rec.muscleGroup || 'General';
                  const equipLabel = EQUIPMENT_LABELS[rec.equipment] || rec.equipment || 'Variable';
                  const content = (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-white">{idx + 1}. {rec.name}</p>
                        <span className={`text-[10px] px-2 py-1 rounded-md ${rec.inCatalog ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>
                          {rec.inCatalog ? 'Catalogo' : 'Externo'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{rec.reason}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className="text-[11px] bg-slate-700/60 text-gray-300 px-2 py-1 rounded-md">{muscleLabel}</span>
                        <span className="text-[11px] bg-slate-700/60 text-gray-300 px-2 py-1 rounded-md">{equipLabel}</span>
                        <span className="text-[11px] bg-indigo-500/15 text-indigo-300 px-2 py-1 rounded-md">{rec.sets} x {rec.reps}</span>
                      </div>
                      {user && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {!rec.inCatalog && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                saveRecommendationToCatalog(rec, idx);
                              }}
                              disabled={savingRecIdx === `catalog-${idx}` || rec.catalogSaved}
                              className="text-[11px] px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 disabled:opacity-60"
                            >
                              {savingRecIdx === `catalog-${idx}`
                                ? 'Guardando...'
                                : rec.catalogSaved
                                  ? 'Ya guardado en catalogo'
                                  : 'Agregar al catalogo'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              openAddToRoutine(idx);
                            }}
                            disabled={savingRecIdx === `routine-${idx}`}
                            className="text-[11px] px-2.5 py-1 rounded-md bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 disabled:opacity-60"
                          >
                            {savingRecIdx === `routine-${idx}` ? 'Agregando...' : 'Agregar a rutina'}
                          </button>
                        </div>
                      )}
                    </>
                  );

                  if (rec.inCatalog && rec.exerciseId) {
                    return (
                      <Link
                        key={`${rec.name}-${idx}`}
                        to={`/exercises/${rec.exerciseId}`}
                        className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-3 hover:border-primary/40 transition-all"
                      >
                        {content}
                      </Link>
                    );
                  }

                  return (
                    <div
                      key={`${rec.name}-${idx}`}
                      className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-3"
                    >
                      {content}
                    </div>
                  );
                })}
              </div>

              {Array.isArray(aiResult.tips) && aiResult.tips.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {aiResult.tips.map((tip) => (
                    <span key={tip} className="text-[11px] bg-violet-500/10 text-violet-200 border border-violet-500/20 px-2.5 py-1 rounded-lg">
                      {tip}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ══════════ EXERCISE GRID ══════════ */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {exercises.map((ex, idx) => {
            const diff = DIFFICULTY_CONFIG[ex.difficulty] || DIFFICULTY_CONFIG.intermediate;
            const muscleLabel = MUSCLE_GROUPS.find(mg => mg.v === ex.muscleGroup)?.l || ex.muscleGroup;
            const equipLabel = EQUIPMENT_LABELS[ex.equipment] || ex.equipment;
            const gradient = MUSCLE_GRADIENT[ex.muscleGroup] || 'from-slate-600/90 to-slate-800/90';
            const previewImg = ex.imageUrl || MUSCLE_IMAGE[ex.muscleGroup] || MUSCLE_IMAGE.full_body;

            return (
              <Link
                to={`/exercises/${ex._id}`}
                key={ex._id}
                className="animate-fadeInUp group relative bg-slate-800/80 backdrop-blur-sm rounded-2xl overflow-hidden border border-slate-700/50 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/15 hover:-translate-y-1"
                style={{ animationDelay: `${Math.min(idx * 40, 500)}ms` }}
              >
                {/* Preview image with gradient overlay */}
                <div className="relative h-36 overflow-hidden">
                  <img
                    src={previewImg}
                    alt={ex.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-t ${gradient}`} />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />

                  {/* Difficulty badge on image */}
                  <div className="absolute top-3 right-3">
                    <span className={`inline-flex items-center gap-1 ${diff.bg} backdrop-blur-sm px-2.5 py-1 rounded-lg text-[11px] font-bold ${diff.text} border border-white/10`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${diff.dot}`} />
                      {diff.label}
                    </span>
                  </div>

                  {/* Muscle group label on image */}
                  <div className="absolute bottom-3 left-3">
                    <span className="inline-flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs font-bold text-white border border-white/10">
                      <LuTarget className="w-3 h-3" />
                      {muscleLabel}
                    </span>
                  </div>

                  {/* Arrow on hover */}
                  <div className="absolute bottom-3 right-3 w-8 h-8 bg-primary/80 backdrop-blur-sm rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                    <LuArrowRight className="w-4 h-4 text-white" />
                  </div>
                </div>

                {/* Card body */}
                <div className="p-4">
                  <h3 className="font-bold text-[15px] leading-tight group-hover:text-primary transition-colors mb-2">
                    {ex.name}
                  </h3>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 bg-slate-700/60 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-gray-300">
                      <LuDumbbell className="w-3 h-3 text-gray-500" />
                      {equipLabel}
                    </span>
                    {ex.secondaryMuscles?.length > 0 && (
                      <span className="inline-flex items-center gap-1 bg-primary/10 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-primary/80">
                        +{ex.secondaryMuscles.length} secundario{ex.secondaryMuscles.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}

          {/* Empty state */}
          {exercises.length === 0 && (
            <div className="col-span-full text-center py-16 space-y-4 animate-fadeInUp">
              <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl flex items-center justify-center mx-auto border border-primary/20">
                <LuSearch className="w-10 h-10 text-primary animate-float" />
              </div>
              <div>
                <p className="text-gray-300 text-lg font-semibold">No se encontraron ejercicios</p>
                <p className="text-gray-500 text-sm mt-1">Intenta con otro filtro o término de búsqueda</p>
              </div>
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-indigo-600 hover:from-indigo-600 hover:to-primary px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-primary/25"
              >
                <LuX className="w-4 h-4" /> Limpiar filtros
              </button>
            </div>
          )}
        </div>
      </div>

      {addModal.open && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-4">
            <h3 className="text-base font-bold text-white">Agregar ejercicio a rutina</h3>
            <div className="space-y-2">
              <label className="text-xs text-gray-400 block">Rutina</label>
              <select
                value={addModal.routineId}
                onChange={(e) =>
                  setAddModal((prev) => ({
                    ...prev,
                    routineId: e.target.value,
                    dayIndex: 0,
                  }))
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm"
              >
                {routines.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-400 block">Dia</label>
              <select
                value={addModal.dayIndex}
                onChange={(e) =>
                  setAddModal((prev) => ({ ...prev, dayIndex: Number(e.target.value) || 0 }))
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm"
              >
                {(selectedRoutine?.days || [{ dayLabel: 'Dia 1' }]).map((d, i) => {
                  const muscles = [
                    ...new Set((d.exercises || []).map((ex) => ex.exercise?.muscleGroup).filter(Boolean)),
                  ];
                  const muscleLabel = muscles.length ? muscles.join(', ') : 'sin ejercicios';
                  return (
                    <option key={`${d.dayLabel}-${i}`} value={i}>
                      {(d.dayLabel || `Dia ${i + 1}`)} - {muscleLabel}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="bg-slate-800/70 border border-slate-700 rounded-xl p-3 space-y-2">
              <p className="text-xs text-gray-300">
                Ejercicio recomendado:
                <span className="font-semibold text-white ml-1">{selectedRecommendation?.name || '-'}</span>
              </p>
              <p className="text-xs text-gray-300">
                Grupo del ejercicio:
                <span className="font-semibold text-primary ml-1">
                  {MUSCLE_GROUPS.find((mg) => mg.v === selectedRecommendation?.muscleGroup)?.l || selectedRecommendation?.muscleGroup || 'General'}
                </span>
              </p>
              <p className="text-[11px] text-gray-500">
                Tip: elige el dia que ya entrena ese grupo muscular para mantener coherencia en la rutina.
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={submitAddToRoutine}
                disabled={savingRecIdx === `routine-${addModal.idx}`}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-indigo-600 hover:from-indigo-600 hover:to-primary px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-60"
              >
                {savingRecIdx === `routine-${addModal.idx}` ? <LuLoader className="w-4 h-4 animate-spin" /> : <LuPlus className="w-4 h-4" />}
                Agregar
              </button>
              <button
                type="button"
                onClick={() => setAddModal({ open: false, idx: null, routineId: '', dayIndex: 0 })}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-700 hover:bg-slate-600"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
