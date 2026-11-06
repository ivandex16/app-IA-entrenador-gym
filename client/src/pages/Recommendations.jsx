import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import {
  LuDumbbell, LuFlame, LuHeart, LuSparkles, LuZap, LuActivity,
  LuLink2, LuCog, LuPersonStanding, LuWeight, LuGripHorizontal,
  LuShield, LuMoveHorizontal, LuFootprints, LuTrendingUp, LuGrid3X3, LuCircleDot,
  LuThumbsUp, LuThumbsDown, LuCircleCheck, LuTriangleAlert,
  LuArrowBigUp, LuTrash2, LuClock, LuCalendar, LuCheck, LuArrowRight, LuBot,
} from 'react-icons/lu';

const TIERS = ['rules', 'scoring', 'llm'];
const TIER_LABELS = { rules: 'Reglas', scoring: 'Puntuación', llm: 'IA / LLM' };

const GOAL_OPTIONS = [
  { v: 'muscle_gain', l: 'Ganancia Muscular', Icon: LuDumbbell },
  { v: 'fat_loss', l: 'Pérdida de Grasa', Icon: LuFlame },
  { v: 'endurance', l: 'Resistencia', Icon: LuHeart },
  { v: 'toning', l: 'Tonificación', Icon: LuSparkles },
  { v: 'strength', l: 'Fuerza', Icon: LuZap },
  { v: 'general', l: 'Fitness General', Icon: LuActivity },
];

const LEVEL_OPTIONS = [
  { v: 'beginner', l: 'Principiante', desc: 'Menos de 6 meses entrenando' },
  { v: 'intermediate', l: 'Intermedio', desc: '6 meses a 2 años' },
  { v: 'advanced', l: 'Avanzado', desc: 'Más de 2 años' },
];

const EQUIPMENT_OPTIONS = [
  { v: 'barbell', l: 'Barra', Icon: LuDumbbell },
  { v: 'dumbbell', l: 'Mancuernas', Icon: LuWeight },
  { v: 'cable', l: 'Poleas', Icon: LuLink2 },
  { v: 'machine', l: 'Máquinas', Icon: LuCog },
  { v: 'bodyweight', l: 'Peso Corporal', Icon: LuPersonStanding },
  { v: 'kettlebell', l: 'Kettlebell', Icon: LuWeight },
  { v: 'band', l: 'Bandas', Icon: LuGripHorizontal },
];

const MUSCLE_GROUP_OPTIONS = [
  { v: 'chest', l: 'Pecho', Icon: LuShield },
  { v: 'back', l: 'Espalda', Icon: LuArrowBigUp },
  { v: 'shoulders', l: 'Hombros', Icon: LuMoveHorizontal },
  { v: 'legs', l: 'Piernas', Icon: LuFootprints },
  { v: 'biceps', l: 'Bíceps', Icon: LuDumbbell },
  { v: 'triceps', l: 'Tríceps', Icon: LuTrendingUp },
  { v: 'abs', l: 'Abdominales', Icon: LuGrid3X3 },
  { v: 'glutes', l: 'Glúteos', Icon: LuCircleDot },
];

export default function Recommendations() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // --- Recommendation tabs ---
  const [tier, setTier] = useState('scoring');
  const [rec, setRec] = useState(null);
  const [loading, setLoading] = useState(false);

  // --- AI routine generation ---
  const [generating, setGenerating] = useState(false);
  const [generatedRoutine, setGeneratedRoutine] = useState(null);

  // --- Form state ---
  const [form, setForm] = useState({
    level: 'intermediate',
    goalType: 'muscle_gain',
    goalDescription: '',
    weeklyFrequency: 3,
    availableMinutes: 60,
    height: '',
    weight: '',
    equipment: [],
    focusMuscleGroups: [],
    customNotes: '',
  });

  // Pre-fill form from user profile + latest weight log
  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        level: user.level || prev.level,
        weeklyFrequency: user.weeklyFrequency || prev.weeklyFrequency,
        availableMinutes: user.availableMinutes || prev.availableMinutes,
        height: user.height || prev.height,
        weight: user.weight || prev.weight,
        equipment: user.preferences?.equipment?.length ? user.preferences.equipment : prev.equipment,
        focusMuscleGroups: user.preferences?.focusMuscleGroups?.length ? user.preferences.focusMuscleGroups : prev.focusMuscleGroups,
      }));
    }
    // Fetch latest weight log as fallback for weight field
    api.get('/weight').then(({ data }) => {
      if (data?.length > 0) {
        const latestWeight = data[0].weight;
        setForm((prev) => ({
          ...prev,
          weight: prev.weight || latestWeight,
        }));
      }
    }).catch(() => { });
    // Also pre-fill goal from active goal
    api.get('/goals').then(({ data }) => {
      const active = data.find((g) => g.isActive);
      if (active) {
        setForm((prev) => ({
          ...prev,
          goalType: active.type || prev.goalType,
          goalDescription: active.description || prev.goalDescription,
        }));
      }
    }).catch(() => { });
  }, [user]);

  const toggleArrayItem = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((v) => v !== value)
        : [...prev[field], value],
    }));
  };

  const fetchRecommendation = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/recommendations', { params: { tier } });
      setRec(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al obtener recomendación');
    } finally {
      setLoading(false);
    }
  };

  const sendFeedback = async (accepted) => {
    if (!rec?.recommendationId) return;
    await api.put(`/recommendations/${rec.recommendationId}/feedback`, { accepted });
    toast.success(accepted ? '¡Marcado como útil!' : 'Gracias por tu opinión');
  };

  const handleGenerateRoutine = async (e) => {
    e.preventDefault();
    setGenerating(true);
    setGeneratedRoutine(null);
    try {
      const { data } = await api.post('/recommendations/generate-routine', form);
      setGeneratedRoutine(data);
      toast.success('¡Rutina generada con éxito! Se guardó en tus rutinas.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al generar rutina');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08090D] text-zinc-100 pb-24 selection:bg-lime-400 selection:text-black">
      <div className="max-w-4xl mx-auto px-4 pt-8 space-y-8">
        {/* ══════════ AI HERO HEADER ══════════ */}
        <div className="relative overflow-hidden bg-zinc-900/60 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur shadow-2xl">
          {/* Ambient AI Glow */}
          <div className="absolute top-0 right-1/4 w-80 h-80 bg-lime-400/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-10 left-10 w-60 h-60 bg-emerald-500/10 rounded-full blur-[90px] pointer-events-none" />

          <div className="relative flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-lime-400/20 to-emerald-500/10 border border-lime-400/30 flex items-center justify-center text-lime-400 shrink-0 shadow-lg shadow-lime-400/10">
                <LuBot className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-lime-400/10 border border-lime-400/30 text-lime-400 text-xs font-bold uppercase tracking-wider shadow-sm">
                    <LuSparkles className="w-3.5 h-3.5" /> IA Coach Gemini
                  </span>
                  <span className="text-[11px] font-mono text-zinc-400 px-2 py-0.5 rounded-md bg-zinc-800/80 border border-white/5">
                    Generador Biomecánico
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Generar Rutina con <span className="bg-gradient-to-r from-white via-zinc-100 to-lime-400 bg-clip-text text-transparent">IA</span>
                </h1>
                <p className="text-zinc-400 text-sm mt-1 max-w-xl">
                  Configura tus datos y Gemini creará una rutina de entrenamiento personalizada según tus objetivos, tiempo y equipamiento.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════ AI ROUTINE GENERATOR FORM ══════════ */}
        <section data-tour="recommendations-form" className="bg-zinc-900/60 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur shadow-xl">
          <form onSubmit={handleGenerateRoutine} className="space-y-7">
            {/* ── 1. Nivel de Experiencia ── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-lime-400" /> Nivel de Experiencia
                </label>
                <span className="text-xs text-zinc-400">Selecciona tu etapa actual</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {LEVEL_OPTIONS.map((lvl) => {
                  const isActive = form.level === lvl.v;
                  return (
                    <button
                      key={lvl.v}
                      type="button"
                      onClick={() => setForm({ ...form, level: lvl.v })}
                      className={`rounded-2xl p-4 transition-all text-center border cursor-pointer flex flex-col items-center justify-center relative overflow-hidden ${
                        isActive
                          ? 'bg-lime-400/10 border-lime-400 text-white font-bold shadow-[0_0_20px_rgba(204,255,0,0.15)] ring-1 ring-lime-400/30'
                          : 'bg-zinc-900/80 border-white/5 text-zinc-400 hover:border-white/15 hover:text-zinc-200 hover:bg-zinc-850'
                      }`}
                    >
                      {isActive && (
                        <span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-lime-400 text-zinc-950 flex items-center justify-center shadow-sm">
                          <LuCheck className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}
                      <p className={`text-sm font-bold ${isActive ? 'text-white' : 'text-zinc-200'}`}>{lvl.l}</p>
                      <p className="text-xs mt-1 text-zinc-400 leading-snug">{lvl.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── 2. Objetivo Principal ── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-lime-400" /> Objetivo Principal
                </label>
                <span className="text-xs text-zinc-400">Enfoque de adaptación metabólica</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {GOAL_OPTIONS.map((g) => {
                  const isActive = form.goalType === g.v;
                  return (
                    <button
                      key={g.v}
                      type="button"
                      onClick={() => setForm({ ...form, goalType: g.v })}
                      className={`p-3.5 rounded-2xl text-left transition-all border flex items-center gap-3 cursor-pointer ${
                        isActive
                          ? 'bg-lime-400/10 border-lime-400 text-white font-bold shadow-[0_0_20px_rgba(204,255,0,0.12)] ring-1 ring-lime-400/30'
                          : 'bg-zinc-900/80 border-white/5 text-zinc-400 hover:border-white/15 hover:text-zinc-200 hover:bg-zinc-850'
                      }`}
                    >
                      <div className={`p-2 rounded-xl border ${
                        isActive
                          ? 'bg-lime-400/20 text-lime-400 border-lime-400/30'
                          : 'bg-zinc-800/80 text-zinc-400 border-white/5'
                      }`}>
                        <g.Icon className="w-4 h-4" />
                      </div>
                      <span className={`text-xs sm:text-sm font-bold truncate ${isActive ? 'text-white' : 'text-zinc-300'}`}>
                        {g.l}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── 3. Descripción del Objetivo (Opcional) ── */}
            <div>
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2 block">
                Describe tu objetivo <span className="text-zinc-500 font-normal lowercase tracking-normal">(opcional)</span>
              </label>
              <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-3 focus-within:border-lime-400 focus-within:ring-1 focus-within:ring-lime-400/30 transition-all shadow-inner">
                <textarea
                  rows={2}
                  placeholder="Ej: Quiero ganar masa muscular en la parte superior del cuerpo, tengo una lesión en la rodilla..."
                  className="w-full bg-transparent text-sm text-white placeholder-zinc-500 resize-none outline-none leading-relaxed"
                  value={form.goalDescription}
                  onChange={(e) => setForm({ ...form, goalDescription: e.target.value })}
                />
              </div>
            </div>

            {/* ── 4. Sliders de Frecuencia y Duración ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Días por semana */}
              <div className="bg-zinc-900/70 border border-white/5 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                    <LuCalendar className="w-3.5 h-3.5 text-lime-400" /> Días por semana
                  </label>
                  <span className="font-black text-lime-400 bg-lime-400/10 px-3 py-1 rounded-lg border border-lime-400/20 text-sm font-mono shadow-sm">
                    {form.weeklyFrequency} {form.weeklyFrequency === 1 ? 'día' : 'días'}
                  </span>
                </div>
                <div className="pt-1">
                  <input
                    type="range"
                    min={1}
                    max={7}
                    className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#CCFF00]"
                    value={form.weeklyFrequency}
                    onChange={(e) => setForm({ ...form, weeklyFrequency: +e.target.value })}
                  />
                  <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-1 px-1">
                    <span>1 día</span>
                    <span>3 días</span>
                    <span>5 días</span>
                    <span>7 días</span>
                  </div>
                </div>
              </div>

              {/* Minutos por sesión */}
              <div className="bg-zinc-900/70 border border-white/5 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                    <LuClock className="w-3.5 h-3.5 text-lime-400" /> Minutos por sesión
                  </label>
                  <span className="font-black text-lime-400 bg-lime-400/10 px-3 py-1 rounded-lg border border-lime-400/20 text-sm font-mono shadow-sm">
                    {form.availableMinutes} min
                  </span>
                </div>
                <div className="pt-1">
                  <input
                    type="range"
                    min={15}
                    max={120}
                    step={5}
                    className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#CCFF00]"
                    value={form.availableMinutes}
                    onChange={(e) => setForm({ ...form, availableMinutes: +e.target.value })}
                  />
                  <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-1 px-1">
                    <span>15 min</span>
                    <span>45 min</span>
                    <span>75 min</span>
                    <span>120 min</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── 5. Altura y Peso ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2 block">
                  Altura (cm)
                </label>
                <div className="bg-zinc-900/80 border border-white/10 rounded-xl px-4 py-3 text-white focus-within:border-lime-400 focus-within:ring-1 focus-within:ring-lime-400/30 transition-all flex items-center gap-2">
                  <input
                    type="number"
                    min={50}
                    max={300}
                    placeholder="Ej: 175"
                    className="w-full bg-transparent text-sm font-semibold text-white placeholder-zinc-500 outline-none font-mono"
                    value={form.height}
                    onChange={(e) => setForm({ ...form, height: e.target.value ? +e.target.value : '' })}
                  />
                  <span className="text-xs text-zinc-500 font-bold uppercase">cm</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2 block">
                  Peso (kg)
                </label>
                <div className="bg-zinc-900/80 border border-white/10 rounded-xl px-4 py-3 text-white focus-within:border-lime-400 focus-within:ring-1 focus-within:ring-lime-400/30 transition-all flex items-center gap-2">
                  <input
                    type="number"
                    min={20}
                    max={500}
                    step="0.1"
                    placeholder="Ej: 70"
                    className="w-full bg-transparent text-sm font-semibold text-white placeholder-zinc-500 outline-none font-mono"
                    value={form.weight}
                    onChange={(e) => setForm({ ...form, weight: e.target.value ? +e.target.value : '' })}
                  />
                  <span className="text-xs text-zinc-500 font-bold uppercase">kg</span>
                </div>
              </div>
            </div>

            {/* ── 6. Equipamiento Disponible ── */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-lime-400" /> Equipamiento disponible
                </label>
                <span className="text-xs text-zinc-500">Dejar vacío = todo el equipo</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {EQUIPMENT_OPTIONS.map((eq) => {
                  const isSelected = form.equipment.includes(eq.v);
                  return (
                    <button
                      key={eq.v}
                      type="button"
                      onClick={() => toggleArrayItem('equipment', eq.v)}
                      className={`rounded-xl px-3.5 py-2 text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all border ${
                        isSelected
                          ? 'bg-lime-400 text-black border-lime-400 font-bold shadow-md shadow-lime-400/20 scale-[1.02]'
                          : 'bg-zinc-900/90 border-white/5 text-zinc-400 hover:text-white hover:border-white/15 hover:bg-zinc-850'
                      }`}
                    >
                      <eq.Icon className="w-3.5 h-3.5" />
                      <span>{eq.l}</span>
                      {isSelected && <LuCheck className="w-3 h-3 stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── 7. Grupos Musculares a Priorizar ── */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-lime-400" /> Grupos musculares a priorizar
                </label>
                <span className="text-xs text-zinc-500">Dejar vacío = todos balanceados</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {MUSCLE_GROUP_OPTIONS.map((mg) => {
                  const isSelected = form.focusMuscleGroups.includes(mg.v);
                  return (
                    <button
                      key={mg.v}
                      type="button"
                      onClick={() => toggleArrayItem('focusMuscleGroups', mg.v)}
                      className={`rounded-xl px-3.5 py-2 text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all border ${
                        isSelected
                          ? 'bg-lime-400 text-black border-lime-400 font-bold shadow-md shadow-lime-400/20 scale-[1.02]'
                          : 'bg-zinc-900/90 border-white/5 text-zinc-400 hover:text-white hover:border-white/15 hover:bg-zinc-850'
                      }`}
                    >
                      <mg.Icon className="w-3.5 h-3.5" />
                      <span>{mg.l}</span>
                      {isSelected && <LuCheck className="w-3 h-3 stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── 8. Instrucciones Adicionales (Opcional) ── */}
            <div>
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2 block">
                Instrucciones adicionales <span className="text-zinc-500 font-normal lowercase tracking-normal">(opcional)</span>
              </label>
              <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-3 focus-within:border-lime-400 focus-within:ring-1 focus-within:ring-lime-400/30 transition-all shadow-inner">
                <textarea
                  rows={2}
                  placeholder="Ej: Prefiero ejercicios compuestos, no incluir peso muerto, quiero trabajar core cada sesión..."
                  className="w-full bg-transparent text-sm text-white placeholder-zinc-500 resize-none outline-none leading-relaxed"
                  value={form.customNotes}
                  onChange={(e) => setForm({ ...form, customNotes: e.target.value })}
                />
              </div>
            </div>

            {/* ── 9. Botón Principal de Envío ── */}
            <button
              type="submit"
              disabled={generating}
              className="w-full py-4 rounded-2xl bg-lime-400 hover:bg-lime-300 text-black font-black text-base shadow-lg shadow-lime-400/25 transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-400 disabled:border-white/10"
            >
              {generating ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-black" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Gemini está creando tu rutina...</span>
                </>
              ) : (
                <>
                  <LuSparkles className="w-5 h-5 text-black" />
                  <span>Generar Mi Rutina Personalizada</span>
                </>
              )}
            </button>
          </form>
        </section>

        {/* ══════════ GENERATED ROUTINE RESULT ══════════ */}
        {generatedRoutine && (
          <section className="bg-zinc-900/70 rounded-3xl p-6 sm:p-8 border border-lime-400/30 shadow-2xl space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-white/10">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-lime-400 animate-pulse" />
                  <span className="text-xs font-bold text-lime-400 uppercase tracking-wider">Plan Generado con Éxito</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                  <LuCircleCheck className="w-6 h-6 text-lime-400" /> {generatedRoutine.routine.name}
                </h3>
                <p className="text-sm text-zinc-400 mt-1 max-w-xl">{generatedRoutine.routine.description}</p>
                {generatedRoutine.engine === 'scoring' && (
                  <p className="text-xs text-amber-400 mt-2 flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl w-fit">
                    <LuZap className="w-3.5 h-3.5 shrink-0" />
                    Generada por el motor local (Gemini no disponible). Cuando la cuota se renueve, se usará IA.
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => navigate(`/routines/${generatedRoutine.routine._id}`)}
                  className="bg-lime-400 hover:bg-lime-300 text-zinc-950 font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-md shadow-lime-400/20 transition flex items-center gap-1.5"
                >
                  Ver Rutina Completa <LuArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigate('/routines')}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm border border-white/10 transition"
                >
                  Ir a Mis Rutinas
                </button>
              </div>
            </div>

            {generatedRoutine.routine.targetMuscleGroups?.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider mr-1">Enfoque:</span>
                {generatedRoutine.routine.targetMuscleGroups.map((mg) => (
                  <span key={mg} className="bg-lime-400/10 text-lime-400 text-xs font-bold px-3 py-1 rounded-xl border border-lime-400/25">
                    {mg}
                  </span>
                ))}
              </div>
            )}

            {/* Multi-day display */}
            {generatedRoutine.routine.days?.length > 0 ? (
              <div className="space-y-4">
                {generatedRoutine.routine.days.map((day, dayIdx) => (
                  <div key={dayIdx} className="bg-zinc-950/70 border border-white/5 rounded-2xl p-4 sm:p-5 space-y-3">
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-lime-400" />
                      {day.dayLabel}
                    </h4>
                    <div className="space-y-2">
                      {(day.exercises || []).map((ex, i) => (
                        <div key={i} className="flex items-center justify-between bg-zinc-900/90 border border-white/5 rounded-xl p-3 hover:border-white/10 transition">
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-lg bg-lime-400/15 text-lime-400 border border-lime-400/20 flex items-center justify-center text-xs font-black font-mono">
                              {i + 1}
                            </span>
                            <div>
                              <p className="text-sm font-bold text-white">{ex.exercise?.name || 'Ejercicio'}</p>
                              <p className="text-xs text-zinc-400 font-medium">{ex.exercise?.muscleGroup}</p>
                            </div>
                          </div>
                          <div className="text-right text-xs">
                            <p className="font-mono font-bold text-white">{ex.sets} × {ex.repsMin}-{ex.repsMax} reps</p>
                            <p className="text-zinc-500 font-mono text-[11px]">{ex.restSeconds}s descanso</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Ejercicios ({generatedRoutine.routine.exercises?.length || 0})
                </h4>
                {(generatedRoutine.routine.exercises || []).map((ex, i) => (
                  <div key={i} className="flex items-center justify-between bg-zinc-950/70 border border-white/5 rounded-xl p-3 hover:border-white/10 transition">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-lime-400/15 text-lime-400 border border-lime-400/20 flex items-center justify-center text-xs font-black font-mono">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-white">{ex.exercise?.name || 'Ejercicio'}</p>
                        <p className="text-xs text-zinc-400 font-medium">{ex.exercise?.muscleGroup}</p>
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <p className="font-mono font-bold text-white">{ex.sets} × {ex.repsMin}-{ex.repsMax} reps</p>
                      <p className="text-zinc-500 font-mono text-[11px]">{ex.restSeconds}s descanso</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {generatedRoutine.unmatchedExercises?.length > 0 && (
              <p className="text-xs text-amber-400 flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl">
                <LuTriangleAlert className="w-4 h-4 shrink-0" /> Ejercicios no encontrados en la base de datos: {generatedRoutine.unmatchedExercises.join(', ')}
              </p>
            )}
          </section>
        )}

        {/* ══════════ CLASSIC RECOMMENDATIONS BY ENGINE ══════════ */}
        <section className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                <LuActivity className="w-5 h-5 text-lime-400" /> Recomendaciones por Motor
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">Explora sugerencias según algoritmos de reglas, scoring o LLM</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="bg-zinc-950 border border-white/10 p-1 rounded-xl flex items-center gap-1">
                {TIERS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTier(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      tier === t
                        ? 'bg-lime-400 text-zinc-950 shadow-sm'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                    }`}
                  >
                    {TIER_LABELS[t]}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={fetchRecommendation}
                disabled={loading}
                className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-4 py-2 rounded-xl text-xs border border-white/10 hover:border-lime-400/30 disabled:opacity-50 transition flex items-center gap-1.5"
              >
                {loading ? 'Pensando…' : 'Obtener Recomendación'}
              </button>
            </div>
          </div>

          {rec && (
            <div className="bg-zinc-950/80 border border-white/10 rounded-2xl p-5 space-y-4 animate-fadeIn">
              <h3 className="text-base font-bold text-white">{rec.title}</h3>
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{rec.body}</p>

              {rec.exercises?.length > 0 && (
                <div className="space-y-2 pt-1 border-t border-white/5">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Ejercicios sugeridos</h4>
                  <div className="flex flex-wrap gap-2">
                    {rec.exercises.map((ex) => (
                      <span key={ex._id} className="bg-zinc-800 text-zinc-200 border border-white/5 text-xs font-semibold px-3 py-1 rounded-xl">
                        {ex.name} <span className="text-lime-400">({ex.muscleGroup})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => sendFeedback(true)}
                  className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <LuThumbsUp className="w-3.5 h-3.5" /> Útil
                </button>
                <button
                  type="button"
                  onClick={() => sendFeedback(false)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white border border-white/5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <LuThumbsDown className="w-3.5 h-3.5" /> No útil
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
