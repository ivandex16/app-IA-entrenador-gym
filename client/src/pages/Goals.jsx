import { useEffect, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  LuTarget, LuPlus, LuX, LuCheck, LuZap, LuFlame, LuDumbbell,
  LuHeart, LuTrendingUp, LuSparkles, LuTrash2, LuPower,
  LuBot, LuSend, LuLoader, LuLightbulb, LuShield,
} from 'react-icons/lu';

const GOAL_TYPES = [
  { v: 'muscle_gain', l: 'Ganar músculo', icon: <LuDumbbell className="w-5 h-5" />, gradient: 'from-purple-500 to-violet-600', bg: 'bg-purple-500/15', text: 'text-purple-400', shadow: 'shadow-purple-500/20' },
  { v: 'fat_loss', l: 'Perder grasa', icon: <LuFlame className="w-5 h-5" />, gradient: 'from-orange-500 to-red-600', bg: 'bg-orange-500/15', text: 'text-orange-400', shadow: 'shadow-orange-500/20' },
  { v: 'endurance', l: 'Resistencia', icon: <LuHeart className="w-5 h-5" />, gradient: 'from-rose-500 to-pink-600', bg: 'bg-rose-500/15', text: 'text-rose-400', shadow: 'shadow-rose-500/20' },
  { v: 'toning', l: 'Tonificación', icon: <LuZap className="w-5 h-5" />, gradient: 'from-cyan-500 to-teal-600', bg: 'bg-cyan-500/15', text: 'text-cyan-400', shadow: 'shadow-cyan-500/20' },
  { v: 'strength', l: 'Fuerza', icon: <LuShield className="w-5 h-5" />, gradient: 'from-amber-500 to-yellow-600', bg: 'bg-amber-500/15', text: 'text-amber-400', shadow: 'shadow-amber-500/20' },
];

const getTypeConfig = (type) => GOAL_TYPES.find(g => g.v === type) || GOAL_TYPES[0];

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'muscle_gain', description: '' });
  const [confirmDelete, setConfirmDelete] = useState(null);

  // AI state
  const [showAI, setShowAI] = useState(false);
  const [aiContext, setAiContext] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);

  const load = () => api.get('/goals').then((r) => setGoals(r.data));
  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.description.trim()) { toast.error('Escribe una descripción'); return; }
    try {
      await api.post('/goals', form);
      toast.success('¡Objetivo creado! 💪');
      setShowForm(false);
      setForm({ type: 'muscle_gain', description: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  const toggleActive = async (goal) => {
    await api.put(`/goals/${goal._id}`, { isActive: !goal.isActive });
    toast.success(goal.isActive ? 'Objetivo pausado' : '¡Objetivo activado!');
    load();
  };

  const handleDelete = async (id) => {
    await api.delete(`/goals/${id}`);
    toast.success('Objetivo eliminado');
    setConfirmDelete(null);
    load();
  };

  const askAI = async () => {
    setAiLoading(true);
    try {
      const { data } = await api.post('/goals/ai-suggest', { context: aiContext });
      setAiSuggestions(data.suggestions || []);
    } catch {
      toast.error('No se pudieron obtener sugerencias');
    }
    setAiLoading(false);
  };

  const useSuggestion = (s) => {
    setForm({ type: s.type, description: s.description });
    setShowForm(true);
    setShowAI(false);
    toast.success('Sugerencia aplicada. ¡Personalízala y guarda!');
  };

  const activeGoals = goals.filter(g => g.isActive);
  const inactiveGoals = goals.filter(g => !g.isActive);

  return (
    <div className="min-h-screen bg-[#08090D] text-zinc-100 pb-20 selection:bg-lime-400 selection:text-black">
      {/* ══════════ HERO BANNER ══════════ */}
      <div className="relative overflow-hidden border-b border-white/10">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1400&q=80)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/80 to-[#08090D]" />
        <div className="absolute top-10 left-1/3 w-[500px] h-[300px] bg-lime-400/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[250px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-4 pt-12 pb-14">
          <div className="animate-fadeInUp">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-lime-400/10 border border-lime-400/25 rounded-2xl flex items-center justify-center shadow-lg shadow-lime-400/10 text-lime-400">
                <LuTarget className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
                  Mis <span className="text-lime-400">Objetivos</span>
                </h1>
                <p className="text-zinc-400 text-sm mt-0.5">Define tus metas, mide tu progreso, alcanza tu mejor versión</p>
              </div>
            </div>
          </div>

          {/* Stats + actions */}
          <div data-tour="goals-actions" className="animate-fadeInUp stagger-1 flex flex-wrap items-center gap-3 mt-6">
            <div className="flex items-center gap-2 bg-zinc-900/90 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 shadow-md">
              <LuTarget className="w-4 h-4 text-lime-400" />
              <span className="text-sm font-bold text-white font-mono">{activeGoals.length}</span>
              <span className="text-xs text-zinc-400">activos</span>
            </div>
            <div className="flex items-center gap-2 bg-zinc-900/90 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 shadow-md">
              <LuTrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-bold text-white font-mono">{goals.length}</span>
              <span className="text-xs text-zinc-400">total</span>
            </div>
            <div className="flex-1" />
            <button
              onClick={() => { setShowAI(!showAI); setShowForm(false); }}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-violet-600/20 active:scale-95"
            >
              <LuBot className="w-4 h-4" /> {showAI ? 'Cerrar IA' : 'Sugerencias IA'}
            </button>
            <button
              onClick={() => { setShowForm(!showForm); setShowAI(false); }}
              className="flex items-center gap-2 bg-lime-400 hover:bg-lime-300 text-zinc-950 px-4 py-2.5 rounded-xl text-sm font-black transition-all shadow-lg shadow-lime-400/20 active:scale-95"
            >
              {showForm ? <><LuX className="w-4 h-4" /> Cancelar</> : <><LuPlus className="w-4 h-4 stroke-[3]" /> Nuevo Objetivo</>}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-6 space-y-6">
        {/* ══════════ AI SUGGESTION PANEL ══════════ */}
        {showAI && (
          <div className="animate-fadeInUp bg-zinc-900/90 backdrop-blur-md rounded-2xl p-6 border border-violet-500/30 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-violet-500/20 border border-violet-500/30 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/10 text-violet-400">
                <LuSparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-lg text-white">Asistente de Objetivos con IA</h2>
                <p className="text-xs text-zinc-400">Gemini te ayuda a encontrar el objetivo perfecto para ti</p>
              </div>
            </div>

            {/* Context input */}
            <div className="space-y-2">
              <label className="text-sm text-zinc-400 flex items-center gap-1.5">
                <LuLightbulb className="w-3.5 h-3.5 text-amber-400" />
                Cuéntale a la IA sobre ti (opcional)
              </label>
              <div className="flex gap-3">
                <input
                  placeholder="Ej: Llevo 3 meses entrenando, quiero definir abdominales, entreno 4 días…"
                  className="flex-1 bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 outline-none text-sm text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all placeholder-zinc-500"
                  value={aiContext}
                  onChange={(e) => setAiContext(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && askAI()}
                />
                <button
                  onClick={askAI}
                  disabled={aiLoading}
                  className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-5 py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                  {aiLoading ? <LuLoader className="w-4 h-4 animate-spin" /> : <LuSend className="w-4 h-4" />}
                  {aiLoading ? 'Pensando…' : 'Generar'}
                </button>
              </div>
            </div>

            {/* Suggestions grid */}
            {aiSuggestions.length > 0 && (
              <div className="grid sm:grid-cols-2 gap-4">
                {aiSuggestions.map((s, idx) => {
                  const cfg = getTypeConfig(s.type);
                  return (
                    <div
                      key={idx}
                      className="bg-zinc-950 border border-white/10 hover:border-violet-500/40 rounded-2xl p-5 transition-all group space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 ${cfg.bg} rounded-lg flex items-center justify-center ${cfg.text} border border-white/5`}>
                            {cfg.icon}
                          </div>
                          <span className={`text-xs font-bold ${cfg.text} uppercase tracking-wide`}>{cfg.l}</span>
                        </div>
                      </div>
                      <h3 className="font-bold text-sm text-white">{s.title}</h3>
                      <p className="text-xs text-zinc-400 leading-relaxed">{s.description}</p>
                      {s.tip && (
                        <div className="flex items-start gap-2 bg-amber-500/10 rounded-lg px-3 py-2 border border-amber-500/15">
                          <LuLightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <p className="text-[11px] text-amber-300/80">{s.tip}</p>
                        </div>
                      )}
                      <button
                        onClick={() => useSuggestion(s)}
                        className="w-full flex items-center justify-center gap-2 bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 text-violet-300 hover:text-white px-3 py-2 rounded-xl text-xs font-bold transition-all"
                      >
                        <LuPlus className="w-3.5 h-3.5" /> Usar esta sugerencia
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Empty hint */}
            {aiSuggestions.length === 0 && !aiLoading && (
              <div className="text-center py-6 space-y-2">
                <LuBot className="w-10 h-10 text-violet-400/50 mx-auto" />
                <p className="text-zinc-400 text-sm">Presiona "Generar" para recibir sugerencias personalizadas</p>
                <p className="text-zinc-500 text-xs">También puedes escribir sobre tu experiencia para mejores resultados</p>
              </div>
            )}
          </div>
        )}

        {/* ══════════ CREATE FORM ══════════ */}
        {showForm && (
          <form onSubmit={handleCreate} className="animate-fadeInUp bg-zinc-900/90 backdrop-blur-md rounded-2xl p-6 border border-white/10 space-y-5 shadow-2xl">
            <h2 className="font-bold text-lg text-white flex items-center gap-2.5">
              <div className="w-8 h-8 bg-lime-400/15 border border-lime-400/30 rounded-xl flex items-center justify-center text-lime-400">
                <LuPlus className="w-4 h-4 stroke-[3]" />
              </div>
              Nuevo Objetivo
            </h2>

            {/* Type selector - visual cards */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2.5 block">Tipo de objetivo</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {GOAL_TYPES.map((g) => {
                  const isSelected = form.type === g.v;
                  return (
                    <button
                      key={g.v}
                      type="button"
                      onClick={() => setForm({ ...form, type: g.v })}
                      className={`flex flex-col items-center gap-2 p-3.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                        isSelected
                          ? 'bg-lime-400 text-zinc-950 font-black shadow-lg shadow-lime-400/20 scale-[1.02]'
                          : 'bg-zinc-950 text-zinc-400 border border-white/10 hover:border-white/20 hover:text-white'
                      }`}
                    >
                      {g.icon}
                      <span>{g.l}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 block">Describe tu objetivo</label>
              <textarea
                placeholder="Ej: Quiero ganar 5kg de músculo en 6 meses con un programa de hipertrofia…"
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 outline-none text-sm text-white focus:border-lime-400 focus:ring-1 focus:ring-lime-400/30 transition-all placeholder-zinc-500 min-h-[100px] resize-none"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <button
              type="submit"
              className="flex items-center gap-2 bg-lime-400 hover:bg-lime-300 text-zinc-950 px-6 py-3 rounded-xl text-sm font-black transition-all shadow-lg shadow-lime-400/20 active:scale-95"
            >
              <LuCheck className="w-4 h-4 stroke-[3]" /> Crear Objetivo
            </button>
          </form>
        )}

        {/* ══════════ ACTIVE GOALS ══════════ */}
        {activeGoals.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 animate-fadeInUp">
              <div className="w-8 h-8 rounded-xl bg-lime-400/10 border border-lime-400/20 flex items-center justify-center text-lime-400 shadow-sm">
                <LuPower className="w-4 h-4 stroke-[2.5]" />
              </div>
              <h2 className="font-extrabold text-lg text-white tracking-tight">
                Objetivos Activos
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {activeGoals.map((g, idx) => {
                const cfg = getTypeConfig(g.type);
                return (
                  <div
                    key={g._id}
                    className="animate-fadeInUp group relative bg-zinc-900/60 border border-white/10 hover:border-lime-400/30 rounded-2xl p-6 transition-all duration-200 hover:shadow-xl hover:shadow-lime-400/5 flex flex-col justify-between"
                    style={{ animationDelay: `${idx * 80}ms` }}
                  >
                    <div>
                      {/* Encabezado: Icono destacado en cápsula + Título en mayúsculas negrita + Badge EN CURSO */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl border border-white/10 ${cfg.bg} ${cfg.text} shadow-sm shrink-0 flex items-center justify-center`}>
                            {cfg.icon}
                          </div>
                          <div>
                            <h3 className="font-extrabold text-white text-base tracking-wide uppercase">
                              {cfg.l}
                            </h3>
                            <span className="text-xs text-zinc-500 font-medium">
                              Creado el {new Date(g.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                        </div>

                        {/* Badge discreto de estado en verde lima */}
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-lime-400/10 text-lime-400 border border-lime-400/25 text-[10px] font-bold tracking-wider uppercase shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" />
                          En curso
                        </span>
                      </div>

                      {/* Descripción con texto nítido y buen contraste */}
                      <p className="text-zinc-300 text-sm leading-relaxed mt-4">
                        {g.description || 'Sin descripción'}
                      </p>
                    </div>

                    {/* Botones de acción refinados */}
                    <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-white/5">
                      <button
                        type="button"
                        onClick={() => toggleActive(g)}
                        className="px-3.5 py-1.5 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white border border-white/5 hover:border-zinc-700 text-xs font-semibold flex items-center gap-1.5 transition-colors active:scale-95"
                      >
                        <LuPower className="w-3.5 h-3.5 text-amber-400" /> Pausar
                      </button>

                      {confirmDelete === g._id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleDelete(g._id)}
                            className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                          >
                            Confirmar
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(null)}
                            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border border-white/5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(g._id)}
                          className="p-2 rounded-xl bg-zinc-800/60 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 border border-white/5 transition-colors active:scale-95"
                          title="Eliminar objetivo"
                        >
                          <LuTrash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════ INACTIVE GOALS ══════════ */}
        {inactiveGoals.length > 0 && (
          <div className="space-y-3.5">
            <h2 className="font-bold text-xs text-zinc-500 uppercase tracking-wider flex items-center gap-2 animate-fadeInUp">
              Objetivos Pausados ({inactiveGoals.length})
            </h2>
            <div className="grid sm:grid-cols-2 gap-3.5">
              {inactiveGoals.map((g) => {
                const cfg = getTypeConfig(g.type);
                return (
                  <div
                    key={g._id}
                    className="animate-fadeInUp opacity-75 bg-zinc-900/40 hover:opacity-100 hover:bg-zinc-900/70 border border-white/5 hover:border-white/10 rounded-2xl p-4 transition-all duration-200"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 bg-zinc-800/80 border border-white/5 rounded-xl flex items-center justify-center text-zinc-400 shrink-0">
                          {cfg.icon}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block truncate">{cfg.l}</span>
                          <p className="text-xs text-zinc-500 truncate mt-0.5">{g.description || 'Sin descripción'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleActive(g)}
                          className="bg-lime-400/10 text-lime-400 border border-lime-400/30 hover:bg-lime-400 hover:text-black font-semibold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all active:scale-95"
                        >
                          <LuPower className="w-3.5 h-3.5" /> Activar
                        </button>
                        <button
                          type="button"
                          onClick={() => confirmDelete === g._id ? handleDelete(g._id) : setConfirmDelete(g._id)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Eliminar"
                        >
                          <LuTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════ EMPTY STATE ══════════ */}
        {goals.length === 0 && !showForm && !showAI && (
          <div className="animate-fadeInUp text-center py-16 space-y-5 bg-zinc-900/40 border border-white/5 rounded-2xl">
            <div className="w-16 h-16 bg-lime-400/10 border border-lime-400/20 rounded-2xl flex items-center justify-center mx-auto text-lime-400 shadow-lg shadow-lime-400/10">
              <LuTarget className="w-8 h-8 stroke-[2.5]" />
            </div>
            <div>
              <p className="text-white text-xl font-extrabold">¡Define tu primer objetivo!</p>
              <p className="text-zinc-400 text-sm mt-1.5 max-w-md mx-auto leading-relaxed">
                Los objetivos te ayudan a mantener el enfoque y recibir recomendaciones personalizadas con IA.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowAI(true)}
                className="inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-violet-600/20 active:scale-95"
              >
                <LuSparkles className="w-4 h-4" /> Pedir sugerencia a la IA
              </button>
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="inline-flex items-center justify-center gap-2 bg-lime-400 hover:bg-lime-300 text-zinc-950 px-5 py-2.5 rounded-xl text-sm font-black transition-all shadow-lg shadow-lime-400/20 active:scale-95"
              >
                <LuPlus className="w-4 h-4 stroke-[3]" /> Crear manualmente
              </button>
            </div>
          </div>
        )}

        {/* ══════════ GUIDE SECTION ══════════ */}
        <div className="animate-fadeInUp bg-zinc-900/40 border border-white/5 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-400 flex items-center gap-2">
            <LuLightbulb className="w-4 h-4 text-lime-400" /> Guía de objetivos
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {[
              { icon: '💪', title: 'Ganar músculo', tip: 'Entrena 4-5 días/semana con progresión de peso. Prioriza ejercicios compuestos.' },
              { icon: '🔥', title: 'Perder grasa', tip: 'Déficit calórico + cardio HIIT + entrenamiento de fuerza para preservar músculo.' },
              { icon: '🏋️', title: 'Aumentar fuerza', tip: 'Series de 3-5 reps con peso alto. Descansa 3-5 min entre series.' },
              { icon: '❤️', title: 'Resistencia', tip: 'Series de 15-20+ reps con descansos cortos. Incluye circuitos y cardio.' },
              { icon: '⚡', title: 'Tonificación', tip: 'Combina pesas con cardio. Series de 12-15 reps con peso moderado.' },
              { icon: '🎯', title: 'Sé específico', tip: 'Objetivos medibles funcionan mejor. Ej: "Levantar 100kg en press banca en 3 meses".' },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3.5 bg-zinc-900/80 border border-white/5 rounded-xl p-4 hover:border-white/15 hover:bg-zinc-850/80 transition-all shadow-sm">
                <div className="w-9 h-9 rounded-xl bg-zinc-800/90 border border-white/10 flex items-center justify-center text-lg shrink-0 shadow-inner">
                  {item.icon}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{item.title}</p>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{item.tip}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
