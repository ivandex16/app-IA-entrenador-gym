import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import {
  LuSearch, LuDumbbell, LuArrowRight, LuZap, LuFlame, LuStar,
  LuShield, LuHeart, LuActivity, LuTarget, LuTrendingUp, LuX,
  LuCheck, LuFilter, LuSparkles,
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

export default function Exercises() {
  const [exercises, setExercises] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);   // multi-select
  const [search, setSearch] = useState('');

  useEffect(() => {
    const params = {};
    if (selectedGroups.length > 0) params.muscleGroup = selectedGroups.join(',');
    if (search) params.search = search;
    api.get('/exercises', { params }).then((r) => setExercises(r.data));
  }, [selectedGroups, search]);

  const toggleGroup = useCallback((v) => {
    setSelectedGroups((prev) =>
      prev.includes(v) ? prev.filter((g) => g !== v) : [...prev, v]
    );
  }, []);

  const clearFilters = () => { setSelectedGroups([]); setSearch(''); };

  const activeLabels = selectedGroups.map(g => MUSCLE_GROUPS.find(mg => mg.v === g)?.l).filter(Boolean);

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
    </div>
  );
}
