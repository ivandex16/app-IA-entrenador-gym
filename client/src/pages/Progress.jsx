import { useEffect, useState, useRef } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import html2canvas from 'html2canvas';
import {
  LuDumbbell, LuFlame, LuTarget, LuScale, LuDownload, LuX,
  LuPlus, LuTrash2, LuZap, LuSparkles, LuFileText,
  LuHeart, LuTrendingUp, LuTrendingDown, LuActivity,
  LuCalendar, LuImage, LuCrown, LuAward,
  LuChartColumnIncreasing, LuRepeat, LuArrowUp, LuArrowDown,
} from 'react-icons/lu';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, AreaChart, Area,
} from 'recharts';

/* â”€â”€â”€ muscle group translations â”€â”€â”€ */
const MG_ES = {
  chest: 'Pecho', back: 'Espalda', shoulders: 'Hombros',
  legs: 'Piernas', biceps: 'Bíceps', triceps: 'Tríceps', abs: 'Abdominales',
};
const MG_COLORS = {
  chest: 'from-red-500 to-rose-600',
  back: 'from-blue-500 to-indigo-600',
  shoulders: 'from-amber-500 to-orange-600',
  legs: 'from-green-500 to-emerald-600',
  biceps: 'from-purple-500 to-violet-600',
  triceps: 'from-pink-500 to-fuchsia-600',
  abs: 'from-cyan-500 to-teal-600',
};
const ALL_GROUPS = ['chest', 'back', 'shoulders', 'legs', 'biceps', 'triceps', 'abs'];

/* â”€â”€â”€ helpers â”€â”€â”€ */
const fmtDate = (iso) => {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
};

const TrendBadge = ({ value, suffix = '', invert = false }) => {
  if (value == null) return null;
  const positive = invert ? value < 0 : value > 0;
  const negative = invert ? value > 0 : value < 0;
  const color = positive ? 'text-emerald-400 bg-emerald-500/15' : negative ? 'text-red-400 bg-red-500/15' : 'text-gray-400 bg-slate-700';
  const Icon = positive ? LuArrowUp : negative ? LuArrowDown : null;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>
      {Icon && <Icon className="w-3 h-3" />}
      {value > 0 ? '+' : ''}{value}{suffix}
    </span>
  );
};

export default function Progress() {
  const { user } = useAuth();
  const shareRef = useRef(null);
  const [report, setReport] = useState(null);
  const [weightData, setWeightData] = useState(null);
  const [newWeight, setNewWeight] = useState('');
  const [weightNote, setWeightNote] = useState('');
  const [generating, setGenerating] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);

  const loadWeight = () => api.get('/weight/summary').then((r) => setWeightData(r.data));

  useEffect(() => {
    api.get('/progress/weekly').then((r) => setReport(r.data));
    loadWeight();
  }, []);

  const addWeight = async (e) => {
    e.preventDefault();
    if (!newWeight) return;
    await api.post('/weight', { weight: Number(newWeight), notes: weightNote });
    setNewWeight('');
    setWeightNote('');
    loadWeight();
    api.get('/progress/weekly').then((r) => setReport(r.data));
  };

  const deleteWeight = async (id) => {
    await api.delete(`/weight/${id}`);
    loadWeight();
  };

  /* â”€â”€ share image generation â”€â”€ */
  const downloadShareImage = async () => {
    if (!shareRef.current) return;
    setGenerating(true);
    try {
      const canvas = await html2canvas(shareRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = `StephFit-progreso-${report.period.from}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      /* silent */
    } finally {
      setGenerating(false);
    }
  };

  if (!report)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <LuActivity className="w-10 h-10 text-primary animate-pulse" />
          <p className="text-gray-400">Cargando tu progresoâ€¦</p>
        </div>
      </div>
    );

  const cw = report.currentWeek;
  const pw = report.previousWeek;
  const comp = report.comparison;

  const chartData = [
    { name: 'Sem. Anterior', volumen: pw.totalVolume, entrenos: pw.workouts },
    { name: 'Esta Semana', volumen: cw.totalVolume, entrenos: cw.workouts },
  ];

  const trainedGroups = Object.keys(cw.muscleGroups || {});
  const missedGroups = ALL_GROUPS.filter((g) => !cw.muscleGroups?.[g]);

  return (
    <div className="min-h-screen pb-16">
      {/* â•â•â•â•â•â•â• HERO â•â•â•â•â•â•â• */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/30 via-slate-900 to-cyan-600/20" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />

        <div className="relative max-w-6xl mx-auto px-4 pt-10 pb-8">
          <div className="flex items-center gap-2 mb-2">
            <LuChartColumnIncreasing className="w-5 h-5 text-primary" />
            <span className="text-xs uppercase tracking-widest text-primary font-semibold">Progreso Semanal</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black mb-2">
            Tu Resumen de <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-400">Rendimiento</span>
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
            <span className="inline-flex items-center gap-1.5 bg-slate-800/60 px-3 py-1.5 rounded-full border border-slate-700/50">
              <LuCalendar className="w-4 h-4 text-primary" />
              {fmtDate(report.period.from)} â€” {fmtDate(report.period.to)}
            </span>
            <button
              onClick={() => setShowShareCard(!showShareCard)}
              className="inline-flex items-center gap-1.5 bg-gradient-to-r from-primary to-cyan-500 text-white px-4 py-1.5 rounded-full text-sm font-semibold hover:shadow-lg hover:shadow-primary/25 transition-all"
            >
              <LuImage className="w-4 h-4" />
              {showShareCard ? 'Ocultar tarjeta' : 'Crear imagen para compartir'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-8 space-y-8">

        {/* â•â•â•â•â•â•â• MAIN KPI CARDS â•â•â•â•â•â•â• */}
        <div data-tour="progress-kpis" className="grid grid-cols-2 lg:grid-cols-4 gap-4" style={{ animation: 'fadeInUp 0.5s ease-out' }}>
          <KpiCard
            icon={<LuDumbbell className="w-6 h-6" />}
            label="Entrenamientos"
            value={cw.workouts}
            trend={<TrendBadge value={comp.workoutsChange} />}
            gradient="from-indigo-500 to-purple-600"
            iconBg="bg-indigo-500/15"
          />
          <KpiCard
            icon={<LuChartColumnIncreasing className="w-6 h-6" />}
            label="Volumen Total"
            value={`${cw.totalVolume.toLocaleString()} kg`}
            trend={<TrendBadge value={comp.volumeChange} suffix="%" />}
            gradient="from-cyan-500 to-blue-600"
            iconBg="bg-cyan-500/15"
          />
          <KpiCard
            icon={<LuFlame className="w-6 h-6" />}
            label="Calorías Quemadas"
            value={`${cw.totalCalories || 0} kcal`}
            gradient="from-orange-500 to-red-600"
            iconBg="bg-orange-500/15"
          />
          <KpiCard
            icon={<LuCrown className="w-6 h-6" />}
            label="Peso Máximo"
            value={`${cw.maxWeight} kg`}
            trend={<TrendBadge value={comp.maxWeightChange} suffix=" kg" />}
            gradient="from-amber-500 to-yellow-600"
            iconBg="bg-amber-500/15"
          />
        </div>

        {/* â•â•â•â•â•â•â• SECONDARY KPI STRIP â•â•â•â•â•â•â• */}
        <div className="grid grid-cols-3 gap-3" style={{ animation: 'fadeInUp 0.6s ease-out' }}>
          <div className="bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Series</p>
            <p className="text-2xl font-bold text-white">{cw.totalSets}</p>
          </div>
          <div className="bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Repeticiones</p>
            <p className="text-2xl font-bold text-white">{cw.totalReps}</p>
          </div>
          <div className="bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Ejercicios</p>
            <p className="text-2xl font-bold text-white">{cw.exercisesPerformed.length}</p>
          </div>
        </div>

        {/* â•â•â•â•â•â•â• CHARTS ROW â•â•â•â•â•â•â• */}
        <div className="grid lg:grid-cols-2 gap-6" style={{ animation: 'fadeInUp 0.7s ease-out' }}>
          {/* Volume comparison */}
          <div className="bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-2xl p-5">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <LuChartColumnIncreasing className="w-5 h-5 text-primary" />
              Comparación de Volumen
            </h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barGap={8}>
                <defs>
                  <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 12 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }}
                  labelStyle={{ color: '#e2e8f0' }}
                  itemStyle={{ color: '#a5b4fc' }}
                  formatter={(v) => [`${v.toLocaleString()} kg`, 'Volumen']}
                />
                <Bar dataKey="volumen" fill="url(#volGrad)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Muscle coverage */}
          <div className="bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-2xl p-5">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <LuTarget className="w-5 h-5 text-cyan-400" />
              Cobertura Muscular
            </h2>
            <div className="grid grid-cols-2 gap-2.5">
              {ALL_GROUPS.map((g) => {
                const trained = !!cw.muscleGroups?.[g];
                const count = cw.muscleGroups?.[g] || 0;
                return (
                  <div
                    key={g}
                    className={`relative overflow-hidden rounded-xl p-3 border transition-all ${
                      trained
                        ? 'border-emerald-500/30 bg-emerald-500/10'
                        : 'border-slate-700/50 bg-slate-800/40'
                    }`}
                  >
                    {trained && (
                      <div className={`absolute top-0 right-0 w-12 h-12 bg-gradient-to-br ${MG_COLORS[g]} opacity-20 rounded-bl-full`} />
                    )}
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${trained ? 'text-white' : 'text-gray-500'}`}>
                        {MG_ES[g]}
                      </span>
                      {trained ? (
                        <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-semibold">
                          {count} {count === 1 ? 'ejercicio' : 'ejercicios'}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-600">Sin entrenar</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-center gap-2">
              <div className="h-1.5 flex-1 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full transition-all"
                  style={{ width: `${(trainedGroups.filter(g => ALL_GROUPS.includes(g)).length / ALL_GROUPS.length) * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-400 font-semibold">
                {trainedGroups.filter(g => ALL_GROUPS.includes(g)).length}/{ALL_GROUPS.length}
              </span>
            </div>
          </div>
        </div>

        {/* â•â•â•â•â•â•â• INSIGHTS â•â•â•â•â•â•â• */}
        {report.insights.length > 0 && (
          <div style={{ animation: 'fadeInUp 0.8s ease-out' }}>
            <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
              <LuSparkles className="w-5 h-5 text-amber-400" />
              Observaciones Inteligentes
            </h2>
            <div className="grid md:grid-cols-2 gap-3">
              {report.insights.map((insight, idx) => {
                const emoji = insight.slice(0, 2);
                const text = insight.slice(2).trim();
                const colors = ['border-indigo-500/30 bg-indigo-500/5', 'border-cyan-500/30 bg-cyan-500/5', 'border-amber-500/30 bg-amber-500/5', 'border-emerald-500/30 bg-emerald-500/5', 'border-rose-500/30 bg-rose-500/5'];
                return (
                  <div key={idx} className={`rounded-xl p-4 border ${colors[idx % colors.length]} backdrop-blur`}>
                    <span className="text-2xl mr-2">{emoji}</span>
                    <span className="text-sm text-gray-300 leading-relaxed">{text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* â•â•â•â•â•â•â• EXERCISES PERFORMED â•â•â•â•â•â•â• */}
        {cw.exercisesPerformed.length > 0 && (
          <div className="bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-2xl p-5" style={{ animation: 'fadeInUp 0.85s ease-out' }}>
            <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
              <LuActivity className="w-5 h-5 text-emerald-400" />
              Ejercicios Realizados
            </h2>
            <div className="flex flex-wrap gap-2">
              {cw.exercisesPerformed.map((name) => (
                <span
                  key={name}
                  className="bg-gradient-to-r from-slate-700 to-slate-600 text-sm px-3 py-1.5 rounded-full border border-slate-600/50 text-gray-200 hover:border-primary/50 transition-colors"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* â•â•â•â•â•â•â• WEIGHT SECTION â•â•â•â•â•â•â• */}
        <div className="space-y-6" style={{ animation: 'fadeInUp 0.9s ease-out' }}>
          <h2 className="font-bold text-xl flex items-center gap-2">
            <LuScale className="w-6 h-6 text-primary" />
            Control de Peso Corporal
          </h2>

          {/* Weight KPIs */}
          {report.weightProgress && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {report.weightProgress.currentWeekWeight != null && (
                <div className="bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Peso Actual</p>
                  <p className="text-2xl font-bold text-white mt-1">{report.weightProgress.currentWeekWeight} <span className="text-sm text-gray-400">kg</span></p>
                </div>
              )}
              {report.weightProgress.previousWeekWeight != null && (
                <div className="bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Sem. Anterior</p>
                  <p className="text-2xl font-bold text-white mt-1">{report.weightProgress.previousWeekWeight} <span className="text-sm text-gray-400">kg</span></p>
                </div>
              )}
              {report.weightProgress.change != null && (
                <div className="bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Cambio</p>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <p className="text-2xl font-bold text-white">{report.weightProgress.change > 0 ? '+' : ''}{report.weightProgress.change} <span className="text-sm text-gray-400">kg</span></p>
                  </div>
                </div>
              )}
              <div className="bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Registros</p>
                <p className="text-2xl font-bold text-white mt-1">{report.weightProgress?.entries || 0}</p>
              </div>
            </div>
          )}

          {/* Weight log form */}
          <div className="bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-2xl p-5">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <LuPlus className="w-5 h-5 text-emerald-400" />
              Registrar Peso
            </h3>
            <form onSubmit={addWeight} className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Peso (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  min="20"
                  max="500"
                  value={newWeight}
                  onChange={(e) => setNewWeight(e.target.value)}
                  className="block w-28 bg-slate-900/60 border border-slate-600/50 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                  required
                  placeholder="75.0"
                />
              </div>
              <div className="flex-1 min-w-[180px]">
                <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Nota (opcional)</label>
                <input
                  type="text"
                  value={weightNote}
                  onChange={(e) => setWeightNote(e.target.value)}
                  className="block w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                  maxLength={500}
                  placeholder="Ej: después de desayunar"
                />
              </div>
              <button type="submit" className="bg-gradient-to-r from-primary to-cyan-500 hover:shadow-lg hover:shadow-primary/25 text-white px-6 py-2 rounded-xl text-sm font-semibold transition-all">
                Guardar
              </button>
            </form>

            {/* Goal progress bar */}
            {weightData?.goalProgress && (
              <div className="mt-5 space-y-2 bg-slate-900/40 rounded-xl p-4 border border-slate-700/30">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400 flex items-center gap-1.5">
                    <LuTarget className="w-4 h-4 text-primary" />
                    Meta: {weightData.goalProgress.startWeight} kg â†’ {weightData.goalProgress.targetWeight} kg
                  </span>
                  <span className="text-gray-300 font-semibold">
                    Actual: {weightData.goalProgress.currentWeight} kg
                  </span>
                </div>
                <div className="w-full bg-slate-700/60 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-primary to-cyan-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(weightData.goalProgress.percentage, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Faltan: {weightData.goalProgress.remaining} kg</span>
                  <span className="text-primary font-bold">{weightData.goalProgress.percentage}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Weight chart */}
          {weightData?.logs?.length > 1 && (
            <div className="bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-2xl p-5">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <LuTrendingUp className="w-5 h-5 text-primary" />
                Evolución de Peso
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={weightData.logs.slice().reverse().map((l) => ({
                  date: new Date(l.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
                  peso: l.weight,
                }))}>
                  <defs>
                    <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }} />
                  <Area type="monotone" dataKey="peso" stroke="#6366f1" strokeWidth={2} fill="url(#weightGrad)" dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#0f172a' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Weight history */}
          {weightData?.logs?.length > 0 && (
            <div className="bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-2xl p-5">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <LuFileText className="w-5 h-5 text-gray-400" />
                Historial de Peso
              </h3>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {weightData.logs.slice(0, 20).map((l) => (
                  <div key={l._id} className="flex items-center justify-between bg-slate-900/40 border border-slate-700/30 rounded-xl px-4 py-2.5 hover:border-slate-600/50 transition-all group">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 bg-slate-800 px-2.5 py-1 rounded-lg">
                        {new Date(l.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      <span className="font-bold text-white">{l.weight} <span className="text-sm text-gray-400">kg</span></span>
                    </div>
                    <div className="flex items-center gap-3">
                      {l.notes && <span className="text-xs text-gray-500 max-w-[150px] truncate">{l.notes}</span>}
                      <button onClick={() => deleteWeight(l._id)} className="text-red-400/50 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                        <LuTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* â•â•â•â•â•â•â• SHARE CARD MODAL â•â•â•â•â•â•â• */}
        {showShareCard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ animation: 'fadeIn 0.25s ease-out' }}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowShareCard(false)} />

            {/* Modal content */}
            <div className="relative z-10 flex flex-col items-center gap-5 max-h-[90vh] overflow-y-auto" style={{ animation: 'fadeInUp 0.35s ease-out' }}>
              {/* Close button */}
              <button
                onClick={() => setShowShareCard(false)}
                className="absolute -top-2 -right-2 md:top-0 md:right-0 z-20 w-10 h-10 bg-slate-800 border border-slate-600 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-slate-700 transition-all shadow-lg"
              >
                <LuX className="w-5 h-5" />
              </button>

              <div className="text-center">
                <h2 className="font-bold text-xl text-white flex items-center justify-center gap-2">
                  <LuImage className="w-6 h-6 text-primary" />
                  Tu Tarjeta de Progreso
                </h2>
                <p className="text-sm text-gray-400 mt-1">Descárgala y comparte tu progreso en redes sociales 💪</p>
              </div>

              {/* The share card itself */}
              <div
                ref={shareRef}
                className="w-[480px] max-w-full rounded-2xl overflow-hidden shadow-2xl shadow-primary/10"
                style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
              >
                {/* Card inner */}
                <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 relative">
                  {/* Decorative elements */}
                  <div className="absolute top-0 right-0 w-40 h-40 bg-primary/15 rounded-full blur-2xl" />
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl" />

                  {/* Header */}
                  <div className="relative flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-primary to-cyan-400 rounded-lg flex items-center justify-center">
                        <LuDumbbell className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-lg font-black text-white tracking-tight">StephFit</span>
                    </div>
                    <span className="text-xs text-gray-400 bg-slate-800/80 px-3 py-1 rounded-full border border-slate-700/50">
                      {fmtDate(report.period.from)} â€” {fmtDate(report.period.to)}
                    </span>
                  </div>

                  {/* Title */}
                  <div className="relative mb-5">
                    <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Resumen Semanal de</p>
                    <p className="text-2xl font-black text-white">{user?.name || 'Mi Progreso'}</p>
                  </div>

                  {/* Stats grid */}
                  <div className="relative grid grid-cols-2 gap-3 mb-5">
                    <ShareStat icon="🏋️" label="Entrenamientos" value={cw.workouts} change={comp.workoutsChange > 0 ? `+${comp.workoutsChange}` : comp.workoutsChange !== 0 ? `${comp.workoutsChange}` : null} />
                    <ShareStat icon="📊" label="Volumen" value={`${cw.totalVolume.toLocaleString()} kg`} change={comp.volumeChange !== 0 ? `${comp.volumeChange > 0 ? '+' : ''}${comp.volumeChange}%` : null} />
                    <ShareStat icon="🔥" label="Calorías" value={`${cw.totalCalories || 0} kcal`} />
                    <ShareStat icon="🏆" label="Peso Máx." value={`${cw.maxWeight} kg`} change={comp.maxWeightChange !== 0 ? `${comp.maxWeightChange > 0 ? '+' : ''}${comp.maxWeightChange} kg` : null} />
                  </div>

                  {/* Muscle groups */}
                  <div className="relative mb-5">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Músculos Entrenados</p>
                    <div className="flex flex-wrap gap-1.5">
                      {ALL_GROUPS.map((g) => (
                        <span
                          key={g}
                          className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                            cw.muscleGroups?.[g]
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-800/60 text-gray-600 border border-slate-700/30'
                          }`}
                        >
                          {MG_ES[g]}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Stats bar */}
                  <div className="relative bg-slate-800/60 rounded-xl p-3 mb-4 border border-slate-700/30">
                    <div className="flex justify-between text-center">
                      <div>
                        <p className="text-lg font-bold text-white">{cw.totalSets}</p>
                        <p className="text-[10px] text-gray-400 uppercase">Series</p>
                      </div>
                      <div className="w-px bg-slate-700" />
                      <div>
                        <p className="text-lg font-bold text-white">{cw.totalReps}</p>
                        <p className="text-[10px] text-gray-400 uppercase">Reps</p>
                      </div>
                      <div className="w-px bg-slate-700" />
                      <div>
                        <p className="text-lg font-bold text-white">{cw.exercisesPerformed.length}</p>
                        <p className="text-[10px] text-gray-400 uppercase">Ejercicios</p>
                      </div>
                      <div className="w-px bg-slate-700" />
                      <div>
                        <p className="text-lg font-bold text-white">{trainedGroups.filter(g => ALL_GROUPS.includes(g)).length}/{ALL_GROUPS.length}</p>
                        <p className="text-[10px] text-gray-400 uppercase">Músculos</p>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="relative flex items-center justify-between">
                    <p className="text-xs text-gray-500">Compartido desde StephFit</p>
                    <p className="text-xs text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-400 font-bold">
                      💪 ¡Sigue superándote!
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={downloadShareImage}
                disabled={generating}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-cyan-500 hover:shadow-lg hover:shadow-primary/25 text-white px-8 py-3 rounded-xl font-bold text-base transition-all disabled:opacity-50"
              >
                <LuDownload className="w-5 h-5" />
                {generating ? 'Generandoâ€¦' : 'Descargar Imagen'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* â”€â”€â”€ KPI Card component â”€â”€â”€ */
function KpiCard({ icon, label, value, trend, gradient, iconBg }) {
  return (
    <div className="relative overflow-hidden bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-2xl p-5 hover:border-slate-600/50 transition-all group">
      <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${gradient} opacity-10 rounded-bl-full group-hover:opacity-20 transition-opacity`} />
      <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center mb-3 text-white/80`}>
        {icon}
      </div>
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold text-white mb-1">{value}</p>
      {trend}
    </div>
  );
}

/* â”€â”€â”€ Share card stat â”€â”€â”€ */
function ShareStat({ icon, label, value, change }) {
  return (
    <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/30">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-base">{icon}</span>
        <span className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
      {change && (
        <span className="text-xs text-emerald-400 font-semibold">{change}</span>
      )}
    </div>
  );
}

