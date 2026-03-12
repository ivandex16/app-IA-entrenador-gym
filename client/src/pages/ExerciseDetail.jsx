import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import {
  LuArrowLeft, LuDumbbell, LuTarget, LuStar, LuZap,
  LuListOrdered, LuLightbulb, LuActivity, LuChevronRight, LuFlame,
} from 'react-icons/lu';
import { resolveExerciseVideoSources } from '../utils/videoEmbed';

const MUSCLE_LABELS = {
  chest: 'Pecho', back: 'Espalda', shoulders: 'Hombros', biceps: 'Bíceps',
  triceps: 'Tríceps', legs: 'Piernas', glutes: 'Glúteos', abs: 'Abdominales',
  forearms: 'Antebrazos', calves: 'Pantorrillas', full_body: 'Cuerpo completo', cardio: 'Cardio',
};

const DIFFICULTY_CONFIG = {
  beginner:     { label: 'Principiante', text: 'text-emerald-400', bg: 'bg-emerald-500/15', dot: 'bg-emerald-400' },
  intermediate: { label: 'Intermedio',   text: 'text-amber-400',   bg: 'bg-amber-500/15',   dot: 'bg-amber-400' },
  advanced:     { label: 'Avanzado',     text: 'text-red-400',     bg: 'bg-red-500/15',     dot: 'bg-red-400' },
};

const EQUIPMENT_LABELS = {
  barbell: 'Barra', dumbbell: 'Mancuerna', machine: 'Máquina', cable: 'Cable',
  bodyweight: 'Peso corporal', kettlebell: 'Kettlebell', band: 'Banda', other: 'Otro',
};

const CATEGORY_LABELS = {
  strength: 'Fuerza', hypertrophy: 'Hipertrofia', endurance: 'Resistencia',
  power: 'Potencia', flexibility: 'Flexibilidad',
};

const MUSCLE_GRADIENT = {
  chest: 'from-red-600 to-rose-700',       back: 'from-blue-600 to-indigo-700',
  shoulders: 'from-orange-600 to-amber-700', biceps: 'from-purple-600 to-violet-700',
  triceps: 'from-fuchsia-600 to-pink-700',  legs: 'from-emerald-600 to-green-700',
  glutes: 'from-pink-600 to-rose-700',      abs: 'from-cyan-600 to-teal-700',
  forearms: 'from-indigo-600 to-blue-700',  calves: 'from-teal-600 to-cyan-700',
  full_body: 'from-amber-600 to-yellow-700', cardio: 'from-rose-600 to-red-700',
};

const MUSCLE_IMAGE = {
  chest:     'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1400&q=80',
  back:      'https://images.unsplash.com/photo-1603287681836-b174ce5074c2?w=1400&q=80',
  shoulders: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=1400&q=80',
  biceps:    'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=1400&q=80',
  triceps:   'https://images.unsplash.com/photo-1530822847156-5df684ec5ee1?w=1400&q=80',
  legs:      'https://images.unsplash.com/photo-1434608519344-49d77a699e1d?w=1400&q=80',
  glutes:    'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=1400&q=80',
  abs:       'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1400&q=80',
  forearms:  'https://images.unsplash.com/photo-1534368959876-26bf04f2c947?w=1400&q=80',
  calves:    'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=1400&q=80',
  full_body: 'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=1400&q=80',
  cardio:    'https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=1400&q=80',
};

export default function ExerciseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ex, setEx] = useState(null);
  const [error, setError] = useState(null);
  const [selectedVideoKey, setSelectedVideoKey] = useState('');

  const goBack = () => navigate(-1);

  useEffect(() => {
    setError(null);
    setEx(null);
    setSelectedVideoKey('');
    api.get(`/exercises/${id}`)
      .then((r) => setEx(r.data))
      .catch(() => setError('No se pudo cargar el ejercicio.'));
  }, [id]);

  const videoOptions = ex ? resolveExerciseVideoSources(ex) : [];
  const video =
    videoOptions.find((item) => item.key === selectedVideoKey)
    || videoOptions.find((item) => item.key === 'short')
    || videoOptions[0]
    || null;

  useEffect(() => {
    if (!ex || !videoOptions.length) return;
    if (videoOptions.some((item) => item.key === selectedVideoKey)) return;
    const preferred = videoOptions.find((item) => item.key === 'short') || videoOptions[0];
    setSelectedVideoKey(preferred.key);
  }, [ex, videoOptions, selectedVideoKey]);

  /* ─── Error state ─── */
  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4 animate-fadeInUp">
          <div className="w-16 h-16 bg-red-500/15 rounded-2xl flex items-center justify-center mx-auto">
            <LuZap className="w-8 h-8 text-red-400" />
          </div>
          <p className="text-red-400 font-semibold">{error}</p>
          <button onClick={goBack} className="inline-flex items-center gap-2 text-primary hover:text-white transition text-sm font-semibold">
            <LuArrowLeft className="w-4 h-4" /> Volver atrás
          </button>
        </div>
      </div>
    );

  /* ─── Loading state ─── */
  if (!ex)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3 animate-fadeInUp">
          <div className="w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto">
            <LuDumbbell className="w-7 h-7 text-primary animate-float" />
          </div>
          <p className="text-gray-400 text-sm">Cargando ejercicio…</p>
        </div>
      </div>
    );

  const diff = DIFFICULTY_CONFIG[ex.difficulty] || DIFFICULTY_CONFIG.intermediate;
  const gradient = MUSCLE_GRADIENT[ex.muscleGroup] || 'from-slate-600 to-slate-700';
  const heroImg = ex.imageUrl || MUSCLE_IMAGE[ex.muscleGroup] || MUSCLE_IMAGE.full_body;
  const shortLike = video?.key === 'short';

  return (
    <div className="min-h-screen pb-12">
      {/* ══════════ HERO ══════════ */}
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImg})` }}
        />
        <div className={`absolute inset-0 bg-gradient-to-b ${gradient} opacity-70`} />
        <div className="absolute inset-0 bg-gradient-to-b from-dark/40 via-dark/50 to-dark" />
        <div className="absolute top-10 left-1/4 w-[500px] h-[300px] bg-primary/10 rounded-full blur-[120px]" />

        <div className="relative max-w-4xl mx-auto px-4 pt-8 pb-20">
          {/* Back button */}
          <button
            onClick={goBack}
            className="animate-fadeInUp inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl text-sm font-semibold hover:bg-white/20 transition-all border border-white/10 mb-6"
          >
            <LuArrowLeft className="w-4 h-4" /> Volver
          </button>

          <div className="animate-fadeInUp stagger-1">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 leading-tight">
              {ex.name}
            </h1>

            {/* Tags row */}
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-xl text-xs font-bold border border-white/10">
                <LuTarget className="w-3.5 h-3.5" />
                {MUSCLE_LABELS[ex.muscleGroup] || ex.muscleGroup}
              </span>
              <span className={`inline-flex items-center gap-1.5 ${diff.bg} backdrop-blur-sm px-3 py-1.5 rounded-xl text-xs font-bold ${diff.text} border border-white/10`}>
                <span className={`w-2 h-2 rounded-full ${diff.dot}`} />
                {diff.label}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-xl text-xs font-bold border border-white/10">
                <LuDumbbell className="w-3.5 h-3.5" />
                {EQUIPMENT_LABELS[ex.equipment] || ex.equipment}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-primary/20 backdrop-blur-sm px-3 py-1.5 rounded-xl text-xs font-bold text-primary border border-primary/20">
                <LuFlame className="w-3.5 h-3.5" />
                {CATEGORY_LABELS[ex.category] || ex.category}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-10 space-y-6 relative z-10">
        {/* ══════════ VIDEO ══════════ */}
        {video && (
          <div className="animate-fadeInUp stagger-2 bg-slate-800/80 backdrop-blur-sm rounded-2xl p-2 border border-slate-700/50 shadow-2xl shadow-black/30">
            {videoOptions.length > 1 && (
              <div className="flex items-center gap-2 px-2 py-2">
                {videoOptions.map((item) => {
                  const active = item.key === video.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setSelectedVideoKey(item.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                        active
                          ? 'bg-primary text-white border-primary'
                          : 'bg-slate-700/60 text-gray-300 border-slate-600 hover:bg-slate-700'
                      }`}
                    >
                      {item.title}
                    </button>
                  );
                })}
              </div>
            )}
            <div className={`${shortLike ? 'aspect-[9/16] max-w-sm mx-auto' : 'aspect-video'} rounded-xl overflow-hidden relative group`}>
              {video.mode === 'embed' ? (
                <iframe
                  className="w-full h-full"
                  src={video.src}
                  title={`${ex.name} - ${video.label}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video className="w-full h-full" src={video.src} controls preload="metadata" />
              )}
            </div>
          </div>
        )}

        {/* ══════════ DESCRIPTION ══════════ */}
        {ex.description && (
          <div className="animate-fadeInUp bg-slate-800/60 backdrop-blur-sm rounded-2xl p-5 border border-slate-700/50">
            <p className="text-gray-300 leading-relaxed">{ex.description}</p>
          </div>
        )}

        {/* ══════════ INSTRUCTIONS + TIPS GRID ══════════ */}
        <div className="grid md:grid-cols-2 gap-5">
          {/* Instructions */}
          {ex.instructions?.length > 0 && (
            <div className="animate-fadeInUp stagger-3 bg-slate-800/60 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 hover:border-primary/30 transition-colors">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2.5">
                <div className="w-9 h-9 bg-gradient-to-br from-primary to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                  <LuListOrdered className="w-4.5 h-4.5 text-white" />
                </div>
                Instrucciones
              </h2>
              <div className="space-y-3">
                {ex.instructions.map((step, i) => (
                  <div key={i} className="flex items-start gap-3 group/step">
                    <span className="w-7 h-7 bg-primary/15 rounded-lg flex items-center justify-center text-primary text-xs font-bold shrink-0 mt-0.5 group-hover/step:bg-primary/25 transition-colors">
                      {i + 1}
                    </span>
                    <p className="text-sm text-gray-300 leading-relaxed pt-1">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tips */}
          {ex.tips?.length > 0 && (
            <div className="animate-fadeInUp stagger-4 bg-slate-800/60 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 hover:border-amber-500/30 transition-colors">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2.5">
                <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <LuLightbulb className="w-4.5 h-4.5 text-white" />
                </div>
                Consejos
              </h2>
              <div className="space-y-3">
                {ex.tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-3 group/tip">
                    <div className="w-7 h-7 bg-amber-500/15 rounded-lg flex items-center justify-center shrink-0 mt-0.5 group-hover/tip:bg-amber-500/25 transition-colors">
                      <LuStar className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed pt-1">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ══════════ SECONDARY MUSCLES ══════════ */}
        {ex.secondaryMuscles?.length > 0 && (
          <div className="animate-fadeInUp bg-slate-800/60 backdrop-blur-sm rounded-2xl p-5 border border-slate-700/50">
            <h2 className="font-bold text-sm uppercase tracking-wide text-gray-400 mb-3 flex items-center gap-2">
              <LuActivity className="w-4 h-4 text-accent" /> Músculos secundarios
            </h2>
            <div className="flex flex-wrap gap-2">
              {ex.secondaryMuscles.map((m) => (
                <span
                  key={m}
                  className="inline-flex items-center gap-1.5 bg-accent/10 px-3 py-1.5 rounded-xl text-xs font-bold text-accent border border-accent/20"
                >
                  <LuChevronRight className="w-3 h-3" />
                  {MUSCLE_LABELS[m] || m}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
