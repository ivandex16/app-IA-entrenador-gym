import { useEffect, useState, useRef } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import html2canvas from 'html2canvas';
import {
  LuDumbbell, LuFlame, LuTarget, LuScale, LuDownload, LuX,
  LuPlus, LuTrash2, LuSparkles, LuFileText,
  LuActivity, LuCalendar, LuImage, LuCrown,
  LuChartColumnIncreasing, LuArrowUp, LuArrowDown,
} from 'react-icons/lu';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  AreaChart, Area,
} from 'recharts';

/* ─── muscle group translations ─── */
const MG_ES = {
  chest: 'Pecho', back: 'Espalda', shoulders: 'Hombros',
  legs: 'Piernas', biceps: 'Bíceps', triceps: 'Tríceps', abs: 'Abdominales',
};
const ALL_GROUPS = ['chest', 'back', 'shoulders', 'legs', 'biceps', 'triceps', 'abs'];

/* ─── helpers ─── */
const fmtDate = (iso) => {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
};

const TrendBadge = ({ value, suffix = '', invert = false }) => {
  if (value == null) return null;
  const positive = invert ? value < 0 : value > 0;
  const negative = invert ? value > 0 : value < 0;
  const color = positive
    ? 'text-emerald-400 bg-emerald-500/15 border-emerald-500/25'
    : negative
    ? 'text-rose-400 bg-rose-500/15 border-rose-500/25'
    : 'text-zinc-400 bg-zinc-800 border-white/5';
  const Icon = positive ? LuArrowUp : negative ? LuArrowDown : null;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-md border ${color}`}>
      {Icon && <Icon className="w-3 h-3 stroke-[3]" />}
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

  /* ── share image generation ── */
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
      link.download = `temple-progreso-${report.period.from}.png`;
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
      <div className="min-h-screen bg-[#08090D] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <LuActivity className="w-10 h-10 text-lime-400 animate-pulse" />
          <p className="text-zinc-400 text-sm font-semibold">Cargando tu progreso…</p>
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

  return (
    <div className="min-h-screen bg-[#08090D] text-zinc-100 pb-20 selection:bg-lime-400 selection:text-black">
      {/* ═══════ HERO ═══════ */}
      <div className="relative overflow-hidden border-b border-white/10 bg-gradient-to-b from-black/85 via-black/80 to-[#08090D]">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-lime-400/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-4 pt-10 pb-9">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="px-2.5 py-1 rounded-md bg-lime-400/10 border border-lime-400/20 text-lime-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <LuChartColumnIncreasing className="w-3.5 h-3.5 stroke-[2.5]" /> Progreso Semanal
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-3">
            Tu Resumen de{' '}
            <span className="bg-gradient-to-r from-white to-lime-400 bg-clip-text text-transparent font-black">
              Rendimiento
            </span>
          </h1>

          <div className="flex flex-wrap items-center gap-3">
            {/* Badge de rango de fecha */}
            <span className="inline-flex items-center gap-1.5 bg-zinc-900/80 border border-white/5 text-zinc-400 text-xs px-3.5 py-1.5 rounded-full font-mono shadow-sm">
              <LuCalendar className="w-3.5 h-3.5 text-lime-400" />
              {fmtDate(report.period.from)} — {fmtDate(report.period.to)}
            </span>

            {/* Botón de acción secundario elegante */}
            <button
              onClick={() => setShowShareCard(!showShareCard)}
              className="bg-zinc-900 hover:bg-zinc-850 text-white border border-white/10 hover:border-lime-400/40 rounded-xl px-4 py-2 text-xs font-bold transition-all flex items-center gap-2 shadow-sm active:scale-95"
            >
              <LuImage className="w-3.5 h-3.5 text-lime-400" />
              {showShareCard ? 'Ocultar tarjeta' : 'Crear imagen para compartir'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-8 space-y-7">

        {/* ═══════ MAIN KPI CARDS (SÓLIDAS Y ATLÉTICAS) ═══════ */}
        <div data-tour="progress-kpis" className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fadeInUp">
          <KpiCard
            icon={<LuDumbbell className="w-5 h-5 text-lime-400" />}
            label="Entrenamientos"
            value={cw.workouts}
            trend={<TrendBadge value={comp.workoutsChange} />}
          />
          <KpiCard
            icon={<LuChartColumnIncreasing className="w-5 h-5 text-cyan-400" />}
            label="Volumen Total"
            value={`${cw.totalVolume.toLocaleString()} kg`}
            trend={<TrendBadge value={comp.volumeChange} suffix="%" />}
          />
          <KpiCard
            icon={<LuFlame className="w-5 h-5 text-orange-400" />}
            label="Calorías Quemadas"
            value={`${cw.totalCalories || 0} kcal`}
          />
          <KpiCard
            icon={<LuCrown className="w-5 h-5 text-amber-400" />}
            label="Peso Máximo"
            value={`${cw.maxWeight} kg`}
            trend={<TrendBadge value={comp.maxWeightChange} suffix=" kg" />}
          />
        </div>

        {/* ═══════ SECONDARY KPI STRIP (COMPACTA) ═══════ */}
        <div className="grid grid-cols-3 gap-3 bg-zinc-900/40 border border-white/5 rounded-2xl p-2.5 shadow-sm animate-fadeInUp">
          <div className="bg-zinc-900/80 border border-white/5 rounded-xl p-3.5 text-center">
            <p className="text-[10px] sm:text-xs text-zinc-400 uppercase tracking-wider font-bold mb-1">Series</p>
            <p className="text-xl sm:text-2xl font-black text-white font-mono">{cw.totalSets}</p>
          </div>
          <div className="bg-zinc-900/80 border border-white/5 rounded-xl p-3.5 text-center">
            <p className="text-[10px] sm:text-xs text-zinc-400 uppercase tracking-wider font-bold mb-1">Repeticiones</p>
            <p className="text-xl sm:text-2xl font-black text-white font-mono">{cw.totalReps}</p>
          </div>
          <div className="bg-zinc-900/80 border border-white/5 rounded-xl p-3.5 text-center">
            <p className="text-[10px] sm:text-xs text-zinc-400 uppercase tracking-wider font-bold mb-1">Ejercicios</p>
            <p className="text-xl sm:text-2xl font-black text-white font-mono">{cw.exercisesPerformed.length}</p>
          </div>
        </div>

        {/* ═══════ CHARTS ROW ═══════ */}
        <div className="grid lg:grid-cols-2 gap-6 animate-fadeInUp">
          {/* Comparación de Volumen */}
          <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-extrabold text-base sm:text-lg text-white flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-lime-400/10 border border-lime-400/20 flex items-center justify-center text-lime-400">
                  <LuChartColumnIncreasing className="w-4 h-4 stroke-[2.5]" />
                </div>
                Comparación de Volumen
              </h2>
              <span className="text-xs text-zinc-500 font-mono">kg totales</span>
            </div>

            <div className="w-full h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barGap={12}>
                  <defs>
                    <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a3e635" />
                      <stop offset="100%" stopColor="#4d7c0f" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#71717a"
                    tick={{ fontSize: 12, fill: '#a1a1aa' }}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                  />
                  <YAxis
                    stroke="#71717a"
                    tick={{ fontSize: 11, fill: '#71717a' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#090a0f',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
                    }}
                    labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                    itemStyle={{ color: '#a3e635', fontWeight: 'bold' }}
                    formatter={(v) => [`${v.toLocaleString()} kg`, 'Volumen']}
                  />
                  <Bar dataKey="volumen" fill="url(#volGrad)" radius={[8, 8, 0, 0]} maxBarSize={64} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cobertura Muscular */}
          <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-extrabold text-base sm:text-lg text-white flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center text-cyan-400">
                  <LuTarget className="w-4 h-4 stroke-[2.5]" />
                </div>
                Cobertura Muscular
              </h2>
              <span className="text-xs font-mono font-bold text-lime-400 bg-lime-400/10 border border-lime-400/20 px-2.5 py-0.5 rounded-full">
                {trainedGroups.filter((g) => ALL_GROUPS.includes(g)).length}/{ALL_GROUPS.length}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {ALL_GROUPS.map((g) => {
                const trained = !!cw.muscleGroups?.[g];
                const count = cw.muscleGroups?.[g] || 0;
                return (
                  <div
                    key={g}
                    className={`rounded-xl p-3 border transition-all flex items-center justify-between ${
                      trained
                        ? 'border-lime-400/30 bg-lime-400/5 shadow-sm'
                        : 'border-white/5 bg-zinc-900/60'
                    }`}
                  >
                    <span className={`text-sm ${trained ? 'text-white font-bold' : 'text-zinc-400 font-medium'}`}>
                      {MG_ES[g]}
                    </span>
                    {trained ? (
                      <span className="text-[11px] bg-lime-400/15 text-lime-400 border border-lime-400/30 px-2 py-0.5 rounded-full font-bold">
                        {count} {count === 1 ? 'ejercicio' : 'ejercicios'}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-500 font-medium">Sin entrenar</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Barra de progreso inferior */}
            <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-3">
              <div className="h-2 flex-1 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-lime-400 rounded-full transition-all duration-500 shadow-sm shadow-lime-400/50"
                  style={{ width: `${(trainedGroups.filter((g) => ALL_GROUPS.includes(g)).length / ALL_GROUPS.length) * 100}%` }}
                />
              </div>
              <span className="text-xs font-mono font-bold text-zinc-400">
                {trainedGroups.filter((g) => ALL_GROUPS.includes(g)).length}/{ALL_GROUPS.length} grupos
              </span>
            </div>
          </div>
        </div>

        {/* ═══════ INSIGHTS INTELIGENTES ═══════ */}
        {report.insights.length > 0 && (
          <div className="animate-fadeInUp space-y-3">
            <h2 className="font-extrabold text-base sm:text-lg text-white flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
                <LuSparkles className="w-4 h-4" />
              </div>
              Observaciones Inteligentes
            </h2>
            <div className="grid md:grid-cols-2 gap-3.5">
              {report.insights.map((insight, idx) => {
                const emoji = insight.slice(0, 2);
                const text = insight.slice(2).trim();
                return (
                  <div
                    key={idx}
                    className="rounded-2xl p-4 bg-zinc-900/60 border border-white/5 hover:border-white/10 transition-all flex items-start gap-3.5 shadow-sm"
                  >
                    <span className="text-2xl shrink-0 mt-0.5">{emoji}</span>
                    <span className="text-sm text-zinc-300 leading-relaxed font-medium">{text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══════ EJERCICIOS REALIZADOS ═══════ */}
        {cw.exercisesPerformed.length > 0 && (
          <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 shadow-xl animate-fadeInUp space-y-3">
            <h2 className="font-extrabold text-base sm:text-lg text-white flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center text-emerald-400">
                <LuActivity className="w-4 h-4" />
              </div>
              Ejercicios Realizados ({cw.exercisesPerformed.length})
            </h2>
            <div className="flex flex-wrap gap-2 pt-1">
              {cw.exercisesPerformed.map((name) => (
                <span
                  key={name}
                  className="bg-zinc-900 border border-white/10 hover:border-lime-400/40 text-xs px-3.5 py-1.5 rounded-xl font-medium text-zinc-200 transition-colors shadow-sm"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ═══════ CONTROL DE PESO CORPORAL ═══════ */}
        <div className="space-y-6 animate-fadeInUp">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-lime-400/10 border border-lime-400/20 flex items-center justify-center text-lime-400">
              <LuScale className="w-4 h-4 stroke-[2.5]" />
            </div>
            <h2 className="font-extrabold text-xl text-white tracking-tight">
              Control de Peso Corporal
            </h2>
          </div>

          {/* Weight KPIs */}
          {report.weightProgress && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
              {report.weightProgress.currentWeekWeight != null && (
                <div className="bg-zinc-900/60 border border-white/5 rounded-2xl p-4 text-center shadow-sm">
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Peso Actual</p>
                  <p className="text-2xl font-black text-white font-mono mt-1">
                    {report.weightProgress.currentWeekWeight} <span className="text-xs font-normal text-zinc-400">kg</span>
                  </p>
                </div>
              )}
              {report.weightProgress.previousWeekWeight != null && (
                <div className="bg-zinc-900/60 border border-white/5 rounded-2xl p-4 text-center shadow-sm">
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Sem. Anterior</p>
                  <p className="text-2xl font-black text-white font-mono mt-1">
                    {report.weightProgress.previousWeekWeight} <span className="text-xs font-normal text-zinc-400">kg</span>
                  </p>
                </div>
              )}
              {report.weightProgress.change != null && (
                <div className="bg-zinc-900/60 border border-white/5 rounded-2xl p-4 text-center shadow-sm">
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Cambio</p>
                  <p className="text-2xl font-black text-white font-mono mt-1">
                    {report.weightProgress.change > 0 ? '+' : ''}{report.weightProgress.change} <span className="text-xs font-normal text-zinc-400">kg</span>
                  </p>
                </div>
              )}
              <div className="bg-zinc-900/60 border border-white/5 rounded-2xl p-4 text-center shadow-sm">
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Registros</p>
                <p className="text-2xl font-black text-white font-mono mt-1">{report.weightProgress?.entries || 0}</p>
              </div>
            </div>
          )}

          {/* Formulario de registro de peso */}
          <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
              <LuPlus className="w-4 h-4 text-lime-400" />
              Registrar Peso
            </h3>
            <form onSubmit={addWeight} className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="text-xs text-zinc-400 uppercase tracking-wider font-bold block mb-1.5">Peso (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  min="20"
                  max="500"
                  value={newWeight}
                  onChange={(e) => setNewWeight(e.target.value)}
                  className="block w-32 bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-lime-400 focus:ring-1 focus:ring-lime-400/20 outline-none transition-all"
                  required
                  placeholder="75.0"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs text-zinc-400 uppercase tracking-wider font-bold block mb-1.5">Nota (opcional)</label>
                <input
                  type="text"
                  value={weightNote}
                  onChange={(e) => setWeightNote(e.target.value)}
                  className="block w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-lime-400 focus:ring-1 focus:ring-lime-400/20 outline-none transition-all placeholder-zinc-500"
                  maxLength={500}
                  placeholder="Ej: después de entrenar en ayunas"
                />
              </div>
              <button
                type="submit"
                className="bg-lime-400 hover:bg-lime-300 text-zinc-950 font-black px-6 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-lime-400/20 active:scale-95"
              >
                Guardar
              </button>
            </form>

            {/* Barra de progreso de meta de peso */}
            {weightData?.goalProgress && (
              <div className="mt-5 space-y-2 bg-zinc-950 border border-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-zinc-400 flex items-center gap-1.5 font-medium">
                    <LuTarget className="w-4 h-4 text-lime-400" />
                    Meta: {weightData.goalProgress.startWeight} kg → {weightData.goalProgress.targetWeight} kg
                  </span>
                  <span className="text-white font-bold font-mono">
                    Actual: {weightData.goalProgress.currentWeight} kg
                  </span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-lime-400 h-full rounded-full transition-all duration-500 shadow-sm shadow-lime-400/50"
                    style={{ width: `${Math.min(weightData.goalProgress.percentage, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-zinc-500">Faltan: {weightData.goalProgress.remaining} kg</span>
                  <span className="text-lime-400 font-bold">{weightData.goalProgress.percentage}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Gráfico de evolución de peso */}
          {weightData?.logs?.length > 1 && (
            <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 shadow-xl">
              <h3 className="font-bold text-sm text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <LuTrendingUp className="w-4 h-4 text-lime-400" />
                Evolución de Peso
              </h3>
              <div className="w-full h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weightData.logs.slice().reverse().map((l) => ({
                    date: new Date(l.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
                    peso: l.weight,
                  }))}>
                    <defs>
                      <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#a3e635" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#a3e635" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="date" stroke="#71717a" tick={{ fontSize: 11, fill: '#a1a1aa' }} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} />
                    <YAxis stroke="#71717a" domain={['auto', 'auto']} tick={{ fontSize: 11, fill: '#71717a' }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#090a0f',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
                      }}
                      labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                      itemStyle={{ color: '#a3e635', fontWeight: 'bold' }}
                      formatter={(v) => [`${v} kg`, 'Peso']}
                    />
                    <Area
                      type="monotone"
                      dataKey="peso"
                      stroke="#a3e635"
                      strokeWidth={2.5}
                      fill="url(#weightGrad)"
                      dot={{ r: 4, fill: '#a3e635', strokeWidth: 2, stroke: '#08090D' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Historial de peso */}
          {weightData?.logs?.length > 0 && (
            <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 shadow-xl">
              <h3 className="font-bold text-sm text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <LuFileText className="w-4 h-4 text-zinc-400" />
                Historial de Peso
              </h3>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {weightData.logs.slice(0, 20).map((l) => (
                  <div
                    key={l._id}
                    className="flex items-center justify-between bg-zinc-950 border border-white/5 rounded-xl px-4 py-2.5 hover:border-white/10 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-zinc-400 bg-zinc-900 px-2.5 py-1 rounded-lg border border-white/5">
                        {new Date(l.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      <span className="font-extrabold text-white font-mono">
                        {l.weight} <span className="text-xs font-normal text-zinc-400">kg</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {l.notes && <span className="text-xs text-zinc-500 max-w-[150px] truncate">{l.notes}</span>}
                      <button
                        onClick={() => deleteWeight(l._id)}
                        className="text-zinc-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-1"
                        title="Eliminar registro"
                      >
                        <LuTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ═══════ SHARE CARD MODAL ═══════ */}
        {showShareCard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowShareCard(false)} />

            {/* Modal content */}
            <div className="relative z-10 flex flex-col items-center gap-5 max-h-[90vh] overflow-y-auto animate-fadeInUp">
              {/* Close button */}
              <button
                onClick={() => setShowShareCard(false)}
                className="absolute -top-2 -right-2 md:top-0 md:right-0 z-20 w-10 h-10 bg-zinc-900 border border-white/10 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all shadow-xl"
              >
                <LuX className="w-5 h-5" />
              </button>

              <div className="text-center">
                <h2 className="font-extrabold text-xl text-white flex items-center justify-center gap-2">
                  <LuImage className="w-5 h-5 text-lime-400" />
                  Tu Tarjeta de Progreso
                </h2>
                <p className="text-xs text-zinc-400 mt-1">Descárgala y comparte tu progreso en redes sociales 💪</p>
              </div>

              {/* The share card itself */}
              <div
                ref={shareRef}
                className="w-[480px] max-w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10"
                style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
              >
                <div className="bg-[#090A0F] p-6 relative">
                  {/* Decorative glows */}
                  <div className="absolute top-0 right-0 w-44 h-44 bg-lime-400/15 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-36 h-36 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

                  {/* Header */}
                  <div className="relative flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-lime-400/20 border border-lime-400/30 rounded-lg flex items-center justify-center text-lime-400 font-black text-sm">
                        ⚡
                      </div>
                      <span className="text-base font-black text-white tracking-wider">TEMPLE</span>
                    </div>
                    <span className="text-xs text-zinc-400 bg-zinc-900/90 px-3 py-1 rounded-full border border-white/10 font-mono">
                      {fmtDate(report.period.from)} — {fmtDate(report.period.to)}
                    </span>
                  </div>

                  {/* Title */}
                  <div className="relative mb-5">
                    <p className="text-[11px] text-zinc-500 uppercase tracking-widest mb-0.5 font-bold">Resumen Semanal de</p>
                    <p className="text-2xl font-black text-white tracking-tight">{user?.name || 'Mi Progreso'}</p>
                  </div>

                  {/* Stats grid */}
                  <div className="relative grid grid-cols-2 gap-3 mb-5">
                    <ShareStat
                      icon="🏋️"
                      label="Entrenamientos"
                      value={cw.workouts}
                      change={comp.workoutsChange > 0 ? `+${comp.workoutsChange}` : comp.workoutsChange !== 0 ? `${comp.workoutsChange}` : null}
                    />
                    <ShareStat
                      icon="📊"
                      label="Volumen"
                      value={`${cw.totalVolume.toLocaleString()} kg`}
                      change={comp.volumeChange !== 0 ? `${comp.volumeChange > 0 ? '+' : ''}${comp.volumeChange}%` : null}
                    />
                    <ShareStat
                      icon="🔥"
                      label="Calorías"
                      value={`${cw.totalCalories || 0} kcal`}
                    />
                    <ShareStat
                      icon="🏆"
                      label="Peso Máx."
                      value={`${cw.maxWeight} kg`}
                      change={comp.maxWeightChange !== 0 ? `${comp.maxWeightChange > 0 ? '+' : ''}${comp.maxWeightChange} kg` : null}
                    />
                  </div>

                  {/* Muscle groups */}
                  <div className="relative mb-5">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 font-bold">Músculos Entrenados</p>
                    <div className="flex flex-wrap gap-1.5">
                      {ALL_GROUPS.map((g) => (
                        <span
                          key={g}
                          className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                            cw.muscleGroups?.[g]
                              ? 'bg-lime-400/15 text-lime-400 border border-lime-400/30'
                              : 'bg-zinc-900 text-zinc-600 border border-white/5'
                          }`}
                        >
                          {MG_ES[g]}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Stats bar */}
                  <div className="relative bg-zinc-900/90 rounded-xl p-3 mb-4 border border-white/10">
                    <div className="flex justify-between text-center">
                      <div>
                        <p className="text-lg font-black text-white font-mono">{cw.totalSets}</p>
                        <p className="text-[10px] text-zinc-400 uppercase font-bold">Series</p>
                      </div>
                      <div className="w-px bg-white/10" />
                      <div>
                        <p className="text-lg font-black text-white font-mono">{cw.totalReps}</p>
                        <p className="text-[10px] text-zinc-400 uppercase font-bold">Reps</p>
                      </div>
                      <div className="w-px bg-white/10" />
                      <div>
                        <p className="text-lg font-black text-white font-mono">{cw.exercisesPerformed.length}</p>
                        <p className="text-[10px] text-zinc-400 uppercase font-bold">Ejercicios</p>
                      </div>
                      <div className="w-px bg-white/10" />
                      <div>
                        <p className="text-lg font-black text-white font-mono">
                          {trainedGroups.filter((g) => ALL_GROUPS.includes(g)).length}/{ALL_GROUPS.length}
                        </p>
                        <p className="text-[10px] text-zinc-400 uppercase font-bold">Músculos</p>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="relative flex items-center justify-between text-xs pt-1 border-t border-white/5">
                    <p className="text-zinc-500 font-medium">Compartido desde TEMPLE</p>
                    <p className="text-lime-400 font-bold">
                      💪 ¡Sigue superándote!
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={downloadShareImage}
                disabled={generating}
                className="inline-flex items-center gap-2 bg-lime-400 hover:bg-lime-300 text-zinc-950 px-8 py-3 rounded-xl font-black text-sm transition-all shadow-lg shadow-lime-400/20 disabled:opacity-50 active:scale-95"
              >
                <LuDownload className="w-4 h-4 stroke-[3]" />
                {generating ? 'Generando…' : 'Descargar Imagen'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── KPI Card component (Estilo atlético sin círculos de colores) ─── */
function KpiCard({ icon, label, value, trend }) {
  return (
    <div className="rounded-2xl bg-zinc-900/60 border border-white/5 hover:border-white/10 p-5 transition-all flex flex-col justify-between shadow-lg">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="bg-zinc-800/60 text-zinc-300 p-2 rounded-xl w-fit border border-white/5 flex items-center justify-center">
          {icon}
        </div>
        {trend}
      </div>
      <div>
        <p className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase mb-1">{label}</p>
        <p className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">{value}</p>
      </div>
    </div>
  );
}

/* ─── Share card stat ─── */
function ShareStat({ icon, label, value, change }) {
  return (
    <div className="bg-zinc-900/80 rounded-xl p-3 border border-white/10">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-base">{icon}</span>
        <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">{label}</span>
      </div>
      <p className="text-xl font-black text-white font-mono">{value}</p>
      {change && (
        <span className="text-xs text-lime-400 font-bold">{change}</span>
      )}
    </div>
  );
}
