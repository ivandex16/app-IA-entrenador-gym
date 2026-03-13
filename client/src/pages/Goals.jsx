import { useEffect, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  LuTarget, LuPlus, LuX, LuCheck, LuZap, LuFlame, LuDumbbell,
  LuHeart, LuTrendingUp, LuSparkles, LuTrash2, LuPower,
  LuChevronRight, LuBot, LuSend, LuLoader, LuLightbulb, LuShield,
} from 'react-icons/lu';

const GOAL_TYPES = [
  { v: 'muscle_gain', l: 'Ganar músculo', icon: <LuDumbbell className="w-5 h-5" />, gradient: 'from-purple-500 to-violet-600', bg: 'bg-purple-500/15', text: 'text-purple-400', shadow: 'shadow-purple-500/20' },
  { v: 'fat_loss',    l: 'Perder grasa',  icon: <LuFlame className="w-5 h-5" />,    gradient: 'from-orange-500 to-red-600',    bg: 'bg-orange-500/15', text: 'text-orange-400', shadow: 'shadow-orange-500/20' },
  { v: 'endurance',   l: 'Resistencia',   icon: <LuHeart className="w-5 h-5" />,    gradient: 'from-rose-500 to-pink-600',     bg: 'bg-rose-500/15',   text: 'text-rose-400',   shadow: 'shadow-rose-500/20' },
  { v: 'toning',      l: 'Tonificación',  icon: <LuZap className="w-5 h-5" />,      gradient: 'from-cyan-500 to-teal-600',     bg: 'bg-cyan-500/15',   text: 'text-cyan-400',   shadow: 'shadow-cyan-500/20' },
  { v: 'strength',    l: 'Fuerza',        icon: <LuShield className="w-5 h-5" />,   gradient: 'from-amber-500 to-yellow-600',  bg: 'bg-amber-500/15',  text: 'text-amber-400',  shadow: 'shadow-amber-500/20' },
];

const getTypeConfig = (type) => GOAL_TYPES.find(g => g.v === type) || GOAL_TYPES[0];
const getApiError = (err, fallback = 'Error') =>
  err?.response?.data?.message || err?.message || fallback;

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
    try {
      await api.put(`/goals/${goal._id}`, { isActive: !goal.isActive });
      toast.success(goal.isActive ? 'Objetivo pausado' : 'Objetivo activado');
      load();
    } catch (err) {
      toast.error(getApiError(err, 'No se pudo actualizar el objetivo'));
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/goals/${id}`);
      toast.success('Objetivo eliminado');
      setConfirmDelete(null);
      load();
    } catch (err) {
      toast.error(getApiError(err, 'No se pudo eliminar el objetivo'));
    }
  };

  const askAI = async () => {
    setAiLoading(true);
    try {
      const { data } = await api.post('/goals/ai-suggest', { context: aiContext });
      setAiSuggestions(data.suggestions || []);
    } catch (err) {
      toast.error(getApiError(err, 'No se pudieron obtener sugerencias'));
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
    <div className="min-h-screen pb-12">
      {/* ══════════ HERO BANNER ══════════ */}
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1400&q=80)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-dark/85 via-dark/75 to-dark" />
        <div className="absolute top-10 left-1/3 w-[500px] h-[300px] bg-primary/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[250px] bg-amber-500/10 rounded-full blur-[100px]" />

        <div className="relative max-w-5xl mx-auto px-4 pt-12 pb-14">
          <div className="animate-fadeInUp">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-lg shadow-primary/25">
                <LuTarget className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                  Mis <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-indigo-400 to-accent">Objetivos</span>
                </h1>
                <p className="text-gray-400 text-sm">Define tus metas, mide tu progreso, alcanza tu mejor versión</p>
              </div>
            </div>
          </div>

          {/* Stats + actions */}
          <div data-tour="goals-actions" className="animate-fadeInUp stagger-1 flex flex-wrap items-center gap-3 mt-6">
            <div className="flex items-center gap-2 bg-slate-800/60 backdrop-blur-sm px-4 py-2 rounded-xl border border-slate-700/50">
              <LuTarget className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-white">{activeGoals.length}</span>
              <span className="text-xs text-gray-400">activos</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-800/60 backdrop-blur-sm px-4 py-2 rounded-xl border border-slate-700/50">
              <LuTrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-bold text-white">{goals.length}</span>
              <span className="text-xs text-gray-400">total</span>
            </div>
            <div className="flex-1" />
            <button
              onClick={() => { setShowAI(!showAI); setShowForm(false); }}
              className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-purple-600 hover:to-violet-600 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02]"
            >
              <LuBot className="w-4 h-4" /> {showAI ? 'Cerrar IA' : 'Sugerencias IA'}
            </button>
            <button
              onClick={() => { setShowForm(!showForm); setShowAI(false); }}
              className="flex items-center gap-2 bg-gradient-to-r from-primary to-indigo-600 hover:from-indigo-600 hover:to-primary px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02]"
            >
              {showForm ? <><LuX className="w-4 h-4" /> Cancelar</> : <><LuPlus className="w-4 h-4" /> Nuevo Objetivo</>}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-6 space-y-6">
        {/* ══════════ AI SUGGESTION PANEL ══════════ */}
        {showAI && (
          <div className="animate-fadeInUp bg-gradient-to-br from-violet-950/50 to-purple-950/30 backdrop-blur-sm rounded-2xl p-6 border border-violet-500/30 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
                <LuSparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Asistente de Objetivos con IA</h2>
                <p className="text-xs text-gray-400">La IA te ayuda a encontrar el objetivo perfecto para ti</p>
              </div>
            </div>

            {/* Context input */}
            <div className="space-y-2">
              <label className="text-sm text-gray-400 flex items-center gap-1.5">
                <LuLightbulb className="w-3.5 h-3.5 text-amber-400" />
                Cuéntale a la IA sobre ti (opcional)
              </label>
              <div className="flex gap-3">
                <input
                  placeholder="Ej: Llevo 3 meses entrenando, quiero definir abdominales, entreno 4 días…"
                  className="flex-1 bg-slate-800/80 border border-slate-700/50 rounded-xl px-4 py-3 outline-none text-sm focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all placeholder-gray-500"
                  value={aiContext}
                  onChange={(e) => setAiContext(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && askAI()}
                />
                <button
                  onClick={askAI}
                  disabled={aiLoading}
                  className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-purple-600 hover:to-violet-600 px-5 py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
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
                      className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-5 border border-slate-700/50 hover:border-violet-500/40 transition-all group space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 ${cfg.bg} rounded-lg flex items-center justify-center ${cfg.text}`}>
                            {cfg.icon}
                          </div>
                          <span className={`text-xs font-bold ${cfg.text} uppercase tracking-wide`}>{cfg.l}</span>
                        </div>
                      </div>
                      <h3 className="font-bold text-sm">{s.title}</h3>
                      <p className="text-xs text-gray-400 leading-relaxed">{s.description}</p>
                      {s.tip && (
                        <div className="flex items-start gap-2 bg-amber-500/10 rounded-lg px-3 py-2 border border-amber-500/15">
                          <LuLightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <p className="text-[11px] text-amber-300/80">{s.tip}</p>
                        </div>
                      )}
                      <button
                        onClick={() => useSuggestion(s)}
                        className="w-full flex items-center justify-center gap-2 bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 hover:text-white px-3 py-2 rounded-xl text-xs font-bold transition-all"
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
                <p className="text-gray-500 text-sm">Presiona "Generar" para recibir sugerencias personalizadas</p>
                <p className="text-gray-600 text-xs">También puedes escribir sobre tu experiencia para mejores resultados</p>
              </div>
            )}
          </div>
        )}

        {/* ══════════ CREATE FORM ══════════ */}
        {showForm && (
          <form onSubmit={handleCreate} className="animate-fadeInUp bg-slate-800/60 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 space-y-5">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-indigo-600 rounded-xl flex items-center justify-center">
                <LuPlus className="w-4 h-4 text-white" />
              </div>
              Nuevo Objetivo
            </h2>

            {/* Type selector - visual cards */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Tipo de objetivo</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {GOAL_TYPES.map((g) => (
                  <button
                    key={g.v}
                    type="button"
                    onClick={() => setForm({ ...form, type: g.v })}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl text-xs font-bold transition-all duration-300 ${
                      form.type === g.v
                        ? `bg-gradient-to-br ${g.gradient} text-white shadow-lg ${g.shadow} scale-[1.03]`
                        : 'bg-slate-700/60 text-gray-400 border border-slate-600/50 hover:border-slate-500/70 hover:text-white'
                    }`}
                  >
                    {g.icon}
                    {g.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Describe tu objetivo</label>
              <textarea
                placeholder="Ej: Quiero ganar 5kg de músculo en 6 meses con un programa de hipertrofia…"
                className="w-full bg-slate-700/60 border border-slate-600/50 rounded-xl px-4 py-3 outline-none text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all placeholder-gray-500 min-h-[100px] resize-none"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <button
              type="submit"
              className="flex items-center gap-2 bg-gradient-to-r from-primary to-indigo-600 hover:from-indigo-600 hover:to-primary px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40"
            >
              <LuCheck className="w-4 h-4" /> Crear Objetivo
            </button>
          </form>
        )}

        {/* ══════════ ACTIVE GOALS ══════════ */}
        {activeGoals.length > 0 && (
          <div className="space-y-4">
            <h2 className="font-bold text-lg flex items-center gap-2 animate-fadeInUp">
              <LuPower className="w-5 h-5 text-emerald-400" /> Objetivos Activos
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {activeGoals.map((g, idx) => {
                const cfg = getTypeConfig(g.type);
                return (
                  <div
                    key={g._id}
                    className="animate-fadeInUp group relative bg-slate-800/80 backdrop-blur-sm rounded-2xl overflow-hidden border border-slate-700/50 hover:border-primary/40 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10"
                    style={{ animationDelay: `${idx * 80}ms` }}
                  >
                    {/* Color top bar */}
                    <div className={`h-1.5 bg-gradient-to-r ${cfg.gradient}`} />

                    <div className="p-5 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-11 h-11 bg-gradient-to-br ${cfg.gradient} rounded-xl flex items-center justify-center shadow-lg ${cfg.shadow} text-white`}>
                            {cfg.icon}
                          </div>
                          <div>
                            <span className={`text-xs font-bold ${cfg.text} uppercase tracking-wide`}>{cfg.l}</span>
                            <p className="text-sm text-gray-300 leading-relaxed mt-0.5">{g.description || 'Sin descripción'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Date info */}
                      <p className="text-[11px] text-gray-600">
                        Creado el {new Date(g.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => toggleActive(g)}
                          className="flex items-center gap-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                        >
                          <LuPower className="w-3.5 h-3.5" /> Pausar
                        </button>
                        {confirmDelete === g._id ? (
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => handleDelete(g._id)} className="bg-red-600/20 hover:bg-red-600/40 text-red-400 px-3 py-1.5 rounded-lg text-xs font-bold transition-all">Confirmar</button>
                            <button onClick={() => setConfirmDelete(null)} className="bg-slate-700/60 hover:bg-slate-600/60 text-gray-400 px-3 py-1.5 rounded-lg text-xs font-bold transition-all">No</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(g._id)}
                            className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400/60 hover:text-red-400 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                          >
                            <LuTrash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════ INACTIVE GOALS ══════════ */}
        {inactiveGoals.length > 0 && (
          <div className="space-y-4">
            <h2 className="font-bold text-sm text-gray-500 uppercase tracking-wide flex items-center gap-2 animate-fadeInUp">
              Objetivos Pausados ({inactiveGoals.length})
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {inactiveGoals.map((g) => {
                const cfg = getTypeConfig(g.type);
                return (
                  <div
                    key={g._id}
                    className="animate-fadeInUp bg-slate-800/40 backdrop-blur-sm rounded-2xl p-4 border border-slate-700/30 opacity-60 hover:opacity-100 transition-all"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 ${cfg.bg} rounded-xl flex items-center justify-center ${cfg.text}`}>
                          {cfg.icon}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{cfg.l}</span>
                          <p className="text-xs text-gray-500 mt-0.5">{g.description || 'Sin descripción'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleActive(g)}
                          className="flex items-center gap-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                        >
                          <LuPower className="w-3.5 h-3.5" /> Activar
                        </button>
                        <button
                          onClick={() => confirmDelete === g._id ? handleDelete(g._id) : setConfirmDelete(g._id)}
                          className="text-red-400/40 hover:text-red-400 transition-colors"
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
          <div className="animate-fadeInUp text-center py-16 space-y-5">
            <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl flex items-center justify-center mx-auto border border-primary/20">
              <LuTarget className="w-10 h-10 text-primary animate-float" />
            </div>
            <div>
              <p className="text-gray-300 text-xl font-bold">¡Define tu primer objetivo!</p>
              <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto">
                Los objetivos te ayudan a mantener el enfoque y recibir recomendaciones personalizadas con IA.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <button
                onClick={() => setShowAI(true)}
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-purple-600 hover:to-violet-600 px-6 py-3 rounded-2xl text-sm font-bold transition-all shadow-lg shadow-purple-500/25"
              >
                <LuSparkles className="w-5 h-5" /> Pedir sugerencia a la IA
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-indigo-600 hover:from-indigo-600 hover:to-primary px-6 py-3 rounded-2xl text-sm font-bold transition-all shadow-lg shadow-primary/25"
              >
                <LuPlus className="w-5 h-5" /> Crear manualmente
              </button>
            </div>
          </div>
        )}

        {/* ══════════ GUIDE SECTION ══════════ */}
        <div className="animate-fadeInUp bg-slate-800/40 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/30 space-y-4">
          <h3 className="font-bold text-sm uppercase tracking-wide text-gray-400 flex items-center gap-2">
            <LuLightbulb className="w-4 h-4 text-amber-400" /> Guía de objetivos
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { icon: '💪', title: 'Ganar músculo', tip: 'Entrena 4-5 días/semana con progresión de peso. Prioriza ejercicios compuestos.' },
              { icon: '🔥', title: 'Perder grasa', tip: 'Déficit calórico + cardio HIIT + entrenamiento de fuerza para preservar músculo.' },
              { icon: '🏋️', title: 'Aumentar fuerza', tip: 'Series de 3-5 reps con peso alto. Descansa 3-5 min entre series.' },
              { icon: '❤️', title: 'Resistencia', tip: 'Series de 15-20+ reps con descansos cortos. Incluye circuitos y cardio.' },
              { icon: '⚡', title: 'Tonificación', tip: 'Combina pesas con cardio. Series de 12-15 reps con peso moderado.' },
              { icon: '🎯', title: 'Sé específico', tip: 'Objetivos medibles funcionan mejor. Ej: "Levantar 100kg en press banca en 3 meses".' },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3 bg-slate-700/30 rounded-xl p-3 border border-slate-600/20">
                <span className="text-xl">{item.icon}</span>
                <div>
                  <p className="text-xs font-bold text-gray-300">{item.title}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{item.tip}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

