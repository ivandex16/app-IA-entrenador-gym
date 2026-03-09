import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  LuFileText, LuClipboardList, LuBookOpen, LuBot, LuTrendingUp,
  LuDumbbell, LuFlame, LuTarget, LuCalendar, LuZap, LuArrowRight,
  LuChevronUp, LuChevronDown, LuMinus, LuActivity, LuTimer, LuTrophy,
} from 'react-icons/lu';

const GREETINGS = [
  '¡Cada repetición cuenta!',
  '¡Hoy es tu día para brillar!',
  '¡Sin excusas, sin límites!',
  '¡Supera tus límites hoy!',
  '¡El hierro no miente!',
  '¡A por todas!',
];

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const greeting = GREETINGS[new Date().getDay() % GREETINGS.length];

  useEffect(() => {
    api.get('/progress/weekly').then((r) => setStats(r.data)).catch(() => { });
  }, []);

  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <div className="min-h-screen pb-12">
      {/* ══════════ HERO BANNER ══════════ */}
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1400&q=80)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-dark/85 via-dark/75 to-dark" />
        <div className="absolute top-10 left-1/4 w-[500px] h-[300px] bg-primary/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[250px] bg-accent/10 rounded-full blur-[100px]" />

        <div className="relative max-w-6xl mx-auto px-4 pt-12 pb-16">
          <div className="animate-fadeInUp">
            {/* Welcome */}
            <p className="text-gray-400 text-sm mb-1">{timeGreeting}</p>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2">
              Hola, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-indigo-400 to-accent">{user?.name}</span>
            </h1>
            <p className="text-gray-400 text-lg flex items-center gap-2">
              <LuZap className="w-5 h-5 text-amber-400" /> {greeting}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-6 space-y-8">
        {/* ══════════ QUICK ACTIONS ══════════ */}
        <div data-tour="dashboard-quick-actions" className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              to: '/workouts',
              icon: <LuActivity className="w-7 h-7" />,
              label: 'Registrar Entrenamiento',
              desc: 'Empieza tu sesión',
              gradient: 'from-indigo-600 to-violet-600',
              shadow: 'shadow-indigo-500/20',
              bgIcon: 'bg-indigo-500/20',
              delay: 'stagger-1',
            },
            {
              to: '/routines',
              icon: <LuClipboardList className="w-7 h-7" />,
              label: 'Mis Rutinas',
              desc: 'Planifica tu semana',
              gradient: 'from-cyan-600 to-teal-600',
              shadow: 'shadow-cyan-500/20',
              bgIcon: 'bg-cyan-500/20',
              delay: 'stagger-2',
            },
            {
              to: '/exercises',
              icon: <LuDumbbell className="w-7 h-7" />,
              label: 'Ejercicios',
              desc: 'Catálogo completo',
              gradient: 'from-emerald-600 to-green-600',
              shadow: 'shadow-emerald-500/20',
              bgIcon: 'bg-emerald-500/20',
              delay: 'stagger-3',
            },
            {
              to: '/recommendations',
              icon: <LuBot className="w-7 h-7" />,
              label: 'Consejos IA',
              desc: 'Recomendaciones personalizadas',
              gradient: 'from-purple-600 to-fuchsia-600',
              shadow: 'shadow-purple-500/20',
              bgIcon: 'bg-purple-500/20',
              delay: 'stagger-4',
            },
          ].map((c) => (
            <Link
              key={c.to}
              to={c.to}
              className={`animate-fadeInUp ${c.delay} group relative bg-slate-800/80 backdrop-blur-sm rounded-2xl p-5 border border-slate-700/50 hover:border-transparent transition-all duration-300 hover:shadow-xl ${c.shadow} hover:-translate-y-1 overflow-hidden`}
            >
              {/* Gradient overlay on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${c.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl`} />

              <div className="relative z-10 flex flex-col items-center text-center gap-3">
                <div className={`w-14 h-14 ${c.bgIcon} group-hover:bg-white/20 rounded-2xl flex items-center justify-center transition-colors duration-300`}>
                  {c.icon}
                </div>
                <div>
                  <p className="font-bold text-sm">{c.label}</p>
                  <p className="text-[11px] text-gray-400 group-hover:text-gray-200 transition-colors mt-0.5">{c.desc}</p>
                </div>
                <LuArrowRight className="w-4 h-4 text-gray-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          ))}
        </div>

        {/* ══════════ WEEKLY SUMMARY ══════════ */}
        {stats && (
          <div data-tour="dashboard-weekly-summary" className="animate-fadeInUp space-y-5">
            {/* Section header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                <LuTrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Resumen Semanal</h2>
                <p className="text-xs text-gray-500">{stats.period.from} → {stats.period.to}</p>
              </div>
              <div className="flex-1 h-px bg-gradient-to-r from-slate-700 to-transparent" />
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                icon={<LuCalendar className="w-4 h-4" />}
                iconBg="bg-blue-500/15"
                iconColor="text-blue-400"
                label="Entrenamientos"
                value={stats.currentWeek.workouts}
                accent="text-blue-400"
              />
              <StatCard
                icon={<LuDumbbell className="w-4 h-4" />}
                iconBg="bg-primary/15"
                iconColor="text-primary"
                label="Volumen Total"
                value={`${stats.currentWeek.totalVolume.toLocaleString()} kg`}
                accent="text-primary"
              />
              <StatCard
                icon={<LuTrophy className="w-4 h-4" />}
                iconBg="bg-amber-500/15"
                iconColor="text-amber-400"
                label="Peso Máximo"
                value={`${stats.currentWeek.maxWeight} kg`}
                accent="text-amber-400"
              />
              <StatCard
                icon={<LuTrendingUp className="w-4 h-4" />}
                iconBg={stats.comparison.volumeChange >= 0 ? 'bg-emerald-500/15' : 'bg-red-500/15'}
                iconColor={stats.comparison.volumeChange >= 0 ? 'text-emerald-400' : 'text-red-400'}
                label="Δ Volumen"
                value={`${stats.comparison.volumeChange >= 0 ? '+' : ''}${stats.comparison.volumeChange}%`}
                accent={stats.comparison.volumeChange >= 0 ? 'text-emerald-400' : 'text-red-400'}
                trend={stats.comparison.volumeChange > 0 ? 'up' : stats.comparison.volumeChange < 0 ? 'down' : 'flat'}
              />
            </div>

            {/* Insights */}
            {stats.insights.length > 0 && (
              <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-5 border border-slate-700/50 space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wide text-gray-400 flex items-center gap-2">
                  <LuFlame className="w-4 h-4 text-orange-400" /> Insights
                </h3>
                <div className="space-y-2">
                  {stats.insights.map((insight, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 bg-slate-700/30 rounded-xl px-4 py-3 border border-slate-600/20"
                    >
                      <div className="w-6 h-6 bg-primary/15 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                        <LuZap className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <p className="text-sm text-gray-300">{insight}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* No stats fallback */}
        {!stats && (
          <div className="animate-fadeInUp text-center py-12 space-y-4">
            <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl flex items-center justify-center mx-auto border border-primary/20">
              <LuDumbbell className="w-10 h-10 text-primary animate-float" />
            </div>
            <div>
              <p className="text-gray-300 text-lg font-semibold">Comienza a entrenar</p>
              <p className="text-gray-500 text-sm mt-1">Registra tu primer entrenamiento para ver tu resumen semanal</p>
            </div>
            <Link
              to="/workouts"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-indigo-600 hover:from-indigo-600 hover:to-primary px-6 py-3 rounded-2xl text-sm font-bold transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02]"
            >
              <LuActivity className="w-5 h-5" /> Ir a entrenar
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, iconBg, iconColor, label, value, accent, trend }) {
  return (
    <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-4 border border-slate-700/50 hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-primary/5 group">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-8 h-8 ${iconBg} rounded-xl flex items-center justify-center ${iconColor}`}>
          {icon}
        </div>
        {trend && (
          <div className={`${trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-gray-500'}`}>
            {trend === 'up' ? <LuChevronUp className="w-5 h-5" /> : trend === 'down' ? <LuChevronDown className="w-5 h-5" /> : <LuMinus className="w-4 h-4" />}
          </div>
        )}
      </div>
      <p className={`text-2xl font-extrabold ${accent || 'text-white'}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5 uppercase tracking-wide">{label}</p>
    </div>
  );
}
