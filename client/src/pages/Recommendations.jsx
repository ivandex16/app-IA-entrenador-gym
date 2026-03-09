  LuDumbbell, LuFlame, LuHeart, LuSparkles, LuZap, LuActivity,
  LuLink2, LuCog, LuPersonStanding, LuWeight, LuGripHorizontal,
  LuShield, LuMoveHorizontal, LuFootprints, LuTrendingUp, LuGrid3X3, LuCircleDot,
  LuThumbsUp, LuThumbsDown, LuCircleCheck, LuTriangleAlert,
  LuArrowBigUp, LuTrash2,
} from 'react-icons/lu';
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
  const [loading, setLoading] = useState(false);
  const [tier, setTier] = useState('rules');
  const [goal, setGoal] = useState('');
  const [level, setLevel] = useState('beginner');
  const [equipment, setEquipment] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const fetchRecommendations = () => {
    setLoading(true);
    setError(null);
    api.get(`/recommendations?tier=${tier}&goal=${goal}&level=${level}&equipment=${equipment}`)
      .then(res => {
        setRecommendations(res.data);
        setHistory(prev => [...prev, { goal, level, equipment, recommendations: res.data }]);
        setLoading(false);
      })
      .catch(() => {
        setError('Error al obtener recomendaciones');
        setLoading(false);
        toast.error('Error al obtener recomendaciones');
      });
  };

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

<<<<<<< HEAD
  // Pre-fill form from user profile
=======
  // Pre-fill form from user profile + latest weight log
>>>>>>> 319b4ba (Initial project import: AI gym trainer app (backend, frontend, seed, AI logic, Docker, docs))
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
<<<<<<< HEAD
=======
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
>>>>>>> 319b4ba (Initial project import: AI gym trainer app (backend, frontend, seed, AI logic, Docker, docs))
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
<<<<<<< HEAD
      toast.success('¡Rutina generada con éxito! Se guardó en tus rutinas.');
=======
      toast.success('¡Vista previa lista! Revisa la rutina y confírmala si te gusta.');
>>>>>>> 319b4ba (Initial project import: AI gym trainer app (backend, frontend, seed, AI logic, Docker, docs))
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al generar rutina');
    } finally {
      setGenerating(false);
    }
  };

<<<<<<< HEAD
=======
  const [confirming, setConfirming] = useState(false);

  const handleConfirmRoutine = async () => {
    if (!generatedRoutine) return;
    setConfirming(true);
    try {
      const { data } = await api.post('/recommendations/confirm-routine', {
        routineData: generatedRoutine._routineData,
        goalType: generatedRoutine._goalType,
        engine: generatedRoutine.engine,
      });
      toast.success('¡Rutina guardada en tus rutinas!');
      navigate(`/routines/${data.routine._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar rutina');
    } finally {
      setConfirming(false);
    }
  };

  const handleDiscardRoutine = () => {
    setGeneratedRoutine(null);
    toast('Rutina descartada. Puedes generar otra.', { icon: '🗑️' });
  };

>>>>>>> 319b4ba (Initial project import: AI gym trainer app (backend, frontend, seed, AI logic, Docker, docs))
  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8">
      {/* ══════════ AI ROUTINE GENERATOR FORM ══════════ */}
      <section data-tour="recommendations-form" className="bg-gradient-to-br from-indigo-900/60 to-purple-900/40 rounded-2xl border border-indigo-500/30 overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4 flex items-center gap-3">
          <div className="bg-indigo-500/20 p-3 rounded-xl">
            <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Generar Rutina con IA</h2>
            <p className="text-indigo-300 text-sm">Completa tus datos y Gemini creará tu rutina personalizada</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleGenerateRoutine} className="p-6 pt-2 space-y-5">
          {/* ── Level ── */}
          <div>
            <label className="text-sm font-semibold text-gray-300 mb-2 block">Nivel de experiencia</label>
            <div className="grid grid-cols-3 gap-2">
              {LEVEL_OPTIONS.map((lvl) => (
                <button
                  key={lvl.v}
                  type="button"
                  onClick={() => setForm({ ...form, level: lvl.v })}
                  className={`p-3 rounded-xl text-center transition-all border ${form.level === lvl.v
<<<<<<< HEAD
                      ? 'bg-indigo-600/40 border-indigo-400 text-white'
                      : 'bg-slate-800/50 border-slate-600/50 text-gray-400 hover:border-slate-500'
=======
                    ? 'bg-indigo-600/40 border-indigo-400 text-white'
                    : 'bg-slate-800/50 border-slate-600/50 text-gray-400 hover:border-slate-500'
>>>>>>> 319b4ba (Initial project import: AI gym trainer app (backend, frontend, seed, AI logic, Docker, docs))
                    }`}
                >
                  <p className="text-sm font-semibold">{lvl.l}</p>
                  <p className="text-[10px] mt-0.5 opacity-70">{lvl.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* ── Goal ── */}
          <div>
            <label className="text-sm font-semibold text-gray-300 mb-2 block">Objetivo principal</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {GOAL_OPTIONS.map((g) => (
                <button
                  key={g.v}
                  type="button"
                  onClick={() => setForm({ ...form, goalType: g.v })}
                  className={`p-3 rounded-xl text-left transition-all border flex items-center gap-2 ${form.goalType === g.v
<<<<<<< HEAD
                      ? 'bg-indigo-600/40 border-indigo-400 text-white'
                      : 'bg-slate-800/50 border-slate-600/50 text-gray-400 hover:border-slate-500'
=======
                    ? 'bg-indigo-600/40 border-indigo-400 text-white'
                    : 'bg-slate-800/50 border-slate-600/50 text-gray-400 hover:border-slate-500'
>>>>>>> 319b4ba (Initial project import: AI gym trainer app (backend, frontend, seed, AI logic, Docker, docs))
                    }`}
                >
                  <g.Icon className="w-5 h-5" />
                  <span className="text-sm font-semibold">{g.l}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Goal description ── */}
          <div>
            <label className="text-sm font-semibold text-gray-300 mb-1 block">
              Describe tu objetivo <span className="text-gray-500 font-normal">(opcional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Ej: Quiero ganar masa muscular en la parte superior del cuerpo, tengo una lesión en la rodilla..."
              className="w-full bg-slate-800/60 border border-slate-600/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 resize-none outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50"
              value={form.goalDescription}
              onChange={(e) => setForm({ ...form, goalDescription: e.target.value })}
            />
          </div>

          {/* ── Frequency + Duration ── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-300 mb-1 block">Días por semana</label>
              <div className="flex items-center gap-3 bg-slate-800/60 border border-slate-600/50 rounded-xl px-4 py-2.5">
                <input
                  type="range"
                  min={1}
                  max={7}
                  className="flex-1 accent-indigo-500"
                  value={form.weeklyFrequency}
                  onChange={(e) => setForm({ ...form, weeklyFrequency: +e.target.value })}
                />
                <span className="text-white font-bold text-lg min-w-[2ch] text-center">{form.weeklyFrequency}</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-300 mb-1 block">Minutos por sesión</label>
              <div className="flex items-center gap-3 bg-slate-800/60 border border-slate-600/50 rounded-xl px-4 py-2.5">
                <input
                  type="range"
                  min={15}
                  max={120}
                  step={5}
                  className="flex-1 accent-indigo-500"
                  value={form.availableMinutes}
                  onChange={(e) => setForm({ ...form, availableMinutes: +e.target.value })}
                />
                <span className="text-white font-bold text-lg min-w-[3ch] text-center">{form.availableMinutes}</span>
              </div>
            </div>
          </div>

          {/* ── Height & Weight ── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-300 mb-1 block">Altura (cm)</label>
              <input
                type="number"
                min={50}
                max={300}
                placeholder="Ej: 175"
                className="w-full bg-slate-800/60 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-indigo-500 transition"
                value={form.height}
                onChange={(e) => setForm({ ...form, height: e.target.value ? +e.target.value : '' })}
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-300 mb-1 block">Peso (kg)</label>
              <input
                type="number"
                min={20}
                max={500}
                step="0.1"
                placeholder="Ej: 70"
                className="w-full bg-slate-800/60 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white outline-none focus:border-indigo-500 transition"
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value ? +e.target.value : '' })}
              />
            </div>
          </div>

          {/* ── Equipment ── */}
          <div>
            <label className="text-sm font-semibold text-gray-300 mb-2 block">
              Equipamiento disponible <span className="text-gray-500 font-normal">(deja vacío = todo)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT_OPTIONS.map((eq) => (
                <button
                  key={eq.v}
                  type="button"
                  onClick={() => toggleArrayItem('equipment', eq.v)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border flex items-center gap-1.5 ${form.equipment.includes(eq.v)
<<<<<<< HEAD
                      ? 'bg-indigo-600/40 border-indigo-400 text-white'
                      : 'bg-slate-800/50 border-slate-600/50 text-gray-400 hover:border-slate-500'
=======
                    ? 'bg-indigo-600/40 border-indigo-400 text-white'
                    : 'bg-slate-800/50 border-slate-600/50 text-gray-400 hover:border-slate-500'
>>>>>>> 319b4ba (Initial project import: AI gym trainer app (backend, frontend, seed, AI logic, Docker, docs))
                    }`}
                >
                  <eq.Icon className="w-3.5 h-3.5" /> {eq.l}
                </button>
              ))}
            </div>
          </div>

          {/* ── Muscle groups ── */}
          <div>
            <label className="text-sm font-semibold text-gray-300 mb-2 block">
              Grupos musculares a priorizar <span className="text-gray-500 font-normal">(deja vacío = todos)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {MUSCLE_GROUP_OPTIONS.map((mg) => (
                <button
                  key={mg.v}
                  type="button"
                  onClick={() => toggleArrayItem('focusMuscleGroups', mg.v)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border flex items-center gap-1.5 ${form.focusMuscleGroups.includes(mg.v)
<<<<<<< HEAD
                      ? 'bg-purple-600/40 border-purple-400 text-white'
                      : 'bg-slate-800/50 border-slate-600/50 text-gray-400 hover:border-slate-500'
=======
                    ? 'bg-purple-600/40 border-purple-400 text-white'
                    : 'bg-slate-800/50 border-slate-600/50 text-gray-400 hover:border-slate-500'
>>>>>>> 319b4ba (Initial project import: AI gym trainer app (backend, frontend, seed, AI logic, Docker, docs))
                    }`}
                >
                  <mg.Icon className="w-3.5 h-3.5" /> {mg.l}
                </button>
              ))}
            </div>
          </div>

          {/* ── Custom notes ── */}
          <div>
            <label className="text-sm font-semibold text-gray-300 mb-1 block">
              Instrucciones adicionales <span className="text-gray-500 font-normal">(opcional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Ej: Prefiero ejercicios compuestos, no incluir peso muerto, quiero trabajar core cada sesión..."
              className="w-full bg-slate-800/60 border border-slate-600/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 resize-none outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50"
              value={form.customNotes}
              onChange={(e) => setForm({ ...form, customNotes: e.target.value })}
            />
          </div>

          {/* ── Submit ── */}
          <button
            type="submit"
            disabled={generating}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3.5 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg shadow-lg shadow-indigo-500/20"
          >
            {generating ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Gemini está creando tu rutina...
              </>
            ) : (
              <>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Generar Mi Rutina Personalizada
              </>
            )}
          </button>
        </form>
      </section>

      {/* ══════════ Generated Routine Result ══════════ */}
      {generatedRoutine && (
<<<<<<< HEAD
        <section className="bg-slate-800 rounded-2xl p-6 border border-green-500/30 animate-fade-in">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h3 className="text-xl font-bold text-green-400 flex items-center gap-2"><LuCircleCheck className="w-5 h-5" /> {generatedRoutine.routine.name}</h3>
              <p className="text-sm text-gray-400">{generatedRoutine.routine.description}</p>
              {generatedRoutine.engine === 'scoring' && (
                <p className="text-xs text-amber-400 mt-1 flex items-center gap-1"><LuZap className="w-3.5 h-3.5" /> Generada por el motor local (Gemini no disponible). Cuando la cuota se renueve, se usará IA.</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate(`/routines/${generatedRoutine.routine._id}`)}
                className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
              >
                Ver Rutina Completa
              </button>
              <button
                onClick={() => navigate('/routines')}
                className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
              >
                Ir a Mis Rutinas
=======
        <section className="bg-slate-800 rounded-2xl p-6 border border-amber-500/30 animate-fade-in">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h3 className="text-xl font-bold text-amber-400 flex items-center gap-2"><LuSparkles className="w-5 h-5" /> Vista Previa: {generatedRoutine.preview.name}</h3>
              <p className="text-sm text-gray-400">{generatedRoutine.preview.description}</p>
              {generatedRoutine.engine === 'scoring' && (
                <p className="text-xs text-amber-400 mt-1 flex items-center gap-1"><LuZap className="w-3.5 h-3.5" /> Generada por el motor local (Gemini no disponible). Cuando la cuota se renueve, se usará IA.</p>
              )}
              <p className="text-xs text-gray-500 mt-1">Esta rutina aún no se ha guardado. Revísala y confirma si te gusta.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleConfirmRoutine}
                disabled={confirming}
                className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition flex items-center gap-2"
              >
                {confirming ? (
                  <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Guardando...</>
                ) : (
                  <><LuCircleCheck className="w-4 h-4" /> Confirmar y Guardar</>
                )}
              </button>
              <button
                onClick={handleDiscardRoutine}
                className="bg-red-600/80 hover:bg-red-500 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition flex items-center gap-2"
              >
                <LuTrash2 className="w-4 h-4" /> Descartar
>>>>>>> 319b4ba (Initial project import: AI gym trainer app (backend, frontend, seed, AI logic, Docker, docs))
              </button>
            </div>
          </div>

<<<<<<< HEAD
          {generatedRoutine.routine.targetMuscleGroups?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {generatedRoutine.routine.targetMuscleGroups.map((mg) => (
=======
          {generatedRoutine.preview.targetMuscleGroups?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {generatedRoutine.preview.targetMuscleGroups.map((mg) => (
>>>>>>> 319b4ba (Initial project import: AI gym trainer app (backend, frontend, seed, AI logic, Docker, docs))
                <span key={mg} className="bg-indigo-600/30 text-indigo-300 text-xs px-3 py-1 rounded-full border border-indigo-500/30">
                  {mg}
                </span>
              ))}
            </div>
          )}

          {/* Multi-day display */}
<<<<<<< HEAD
          {generatedRoutine.routine.days?.length > 0 ? (
            <div className="space-y-4">
              {generatedRoutine.routine.days.map((day, dayIdx) => (
=======
          {generatedRoutine.preview.days?.length > 0 ? (
            <div className="space-y-4">
              {generatedRoutine.preview.days.map((day, dayIdx) => (
>>>>>>> 319b4ba (Initial project import: AI gym trainer app (backend, frontend, seed, AI logic, Docker, docs))
                <div key={dayIdx} className="bg-slate-700/30 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-indigo-300 mb-2">{day.dayLabel}</h4>
                  <div className="space-y-1.5">
                    {(day.exercises || []).map((ex, i) => (
                      <div key={i} className="flex items-center justify-between bg-slate-700/50 rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <span className="bg-primary/20 text-primary w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold">
                            {i + 1}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-white">{ex.exercise?.name || 'Ejercicio'}</p>
                            <p className="text-xs text-gray-400">{ex.exercise?.muscleGroup}</p>
                          </div>
                        </div>
                        <div className="text-right text-xs text-gray-300">
                          <p>{ex.sets} × {ex.repsMin}-{ex.repsMax} reps</p>
                          <p className="text-gray-500">{ex.restSeconds}s descanso</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
<<<<<<< HEAD
              <h4 className="text-sm font-semibold text-gray-300">Ejercicios ({generatedRoutine.routine.exercises?.length || 0})</h4>
              {(generatedRoutine.routine.exercises || []).map((ex, i) => (
=======
              <h4 className="text-sm font-semibold text-gray-300">Ejercicios ({generatedRoutine.preview.exercises?.length || 0})</h4>
              {(generatedRoutine.preview.exercises || []).map((ex, i) => (
>>>>>>> 319b4ba (Initial project import: AI gym trainer app (backend, frontend, seed, AI logic, Docker, docs))
                <div key={i} className="flex items-center justify-between bg-slate-700/50 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <span className="bg-primary/20 text-primary w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-white">{ex.exercise?.name || 'Ejercicio'}</p>
                      <p className="text-xs text-gray-400">{ex.exercise?.muscleGroup}</p>
                    </div>
                  </div>
                  <div className="text-right text-xs text-gray-300">
                    <p>{ex.sets} × {ex.repsMin}-{ex.repsMax} reps</p>
                    <p className="text-gray-500">{ex.restSeconds}s descanso</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {generatedRoutine.unmatchedExercises?.length > 0 && (
            <p className="text-xs text-yellow-400 mt-3 flex items-center gap-1">
              <LuTriangleAlert className="w-3.5 h-3.5 shrink-0" /> Ejercicios no encontrados en la base de datos: {generatedRoutine.unmatchedExercises.join(', ')}
            </p>
          )}
        </section>
      )}

      {/* ══════════ CLASSIC RECOMMENDATIONS ══════════ */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-gray-200">Recomendaciones por Motor</h2>

        <div className="flex gap-2 items-center flex-wrap">
          {TIERS.map((t) => (
            <button
              key={t}
              onClick={() => setTier(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${tier === t ? 'bg-primary text-white' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
            >
              {TIER_LABELS[t]}
            </button>
          ))}
          <button
            onClick={fetchRecommendation}
            disabled={loading}
            className="ml-auto bg-primary hover:bg-indigo-600 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 transition"
          >
            {loading ? 'Pensando…' : 'Obtener Recomendación'}
          </button>
        </div>

        {rec && (
          <div className="bg-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="text-lg font-semibold">{rec.title}</h3>
            <p className="text-sm text-gray-300 whitespace-pre-wrap">{rec.body}</p>

            {rec.exercises?.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-1">Ejercicios sugeridos</h4>
                <div className="flex flex-wrap gap-2">
                  {rec.exercises.map((ex) => (
                    <span key={ex._id} className="bg-slate-700 text-xs px-2 py-1 rounded-full">
                      {ex.name} ({ex.muscleGroup})
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => sendFeedback(true)}
                className="bg-green-700 hover:bg-green-600 px-3 py-1 rounded text-xs transition flex items-center gap-1"
              >
                <LuThumbsUp className="w-3.5 h-3.5" /> Útil
              </button>
              <button
                onClick={() => sendFeedback(false)}
                className="bg-slate-600 hover:bg-slate-500 px-3 py-1 rounded text-xs transition flex items-center gap-1"
              >
                <LuThumbsDown className="w-3.5 h-3.5" /> No útil
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
