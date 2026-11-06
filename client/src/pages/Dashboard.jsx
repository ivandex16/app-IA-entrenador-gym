import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  LuClipboardList,
  LuTrendingUp,
  LuDumbbell,
  LuFlame,
  LuTarget,
  LuCalendar,
  LuZap,
  LuArrowRight,
  LuChevronUp,
  LuChevronDown,
  LuMinus,
  LuActivity,
  LuTimer,
  LuTrophy,
  LuCheck,
  LuBot,
  LuSparkles,
} from 'react-icons/lu';

const GREETINGS = [
  '¡Cada repetición cuenta!',
  '¡Hoy es tu día para brillar!',
  '¡Sin excusas, sin límites!',
  '¡Supera tus límites hoy!',
  '¡El hierro no miente!',
  '¡A por todas!',
];

const WEEK_DAYS = [
  { key: 'mon', label: 'Lun', num: 1 },
  { key: 'tue', label: 'Mar', num: 2 },
  { key: 'wed', label: 'Mié', num: 3 },
  { key: 'thu', label: 'Jue', num: 4 },
  { key: 'fri', label: 'Vie', num: 5 },
  { key: 'sat', label: 'Sáb', num: 6 },
  { key: 'sun', label: 'Dom', num: 7 },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const greeting = GREETINGS[new Date().getDay() % GREETINGS.length];

  useEffect(() => {
    api
      .get('/progress/weekly')
      .then((r) => setStats(r.data))
      .catch(() => {});
  }, []);

  const hour = new Date().getHours();
  const timeGreeting =
    hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';

  // Current day index in Mon=0...Sun=6
  const currentDayIndex = (new Date().getDay() + 6) % 7;

  return (
    <div className="min-h-screen bg-[#08090D] text-slate-100 pb-16 selection:bg-lime-400 selection:text-slate-950 font-sans">
      {/* ── Ambient Athletic Lighting ── */}
      <div className="fixed top-0 left-1/4 w-[500px] h-[280px] bg-lime-400/[0.04] rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed top-20 right-1/4 w-[450px] h-[300px] bg-cyan-500/[0.04] rounded-full blur-[140px] pointer-events-none" />

      {/* ══════════════ 1. TOP IMPACT HERO BANNER WITH GYM BACKGROUND ══════════════ */}
      <header className="relative overflow-hidden border-b border-white/[0.08] pt-10 pb-12">
        {/* Immersive Gym Photography Background */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage:
              'url(https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1400&q=80)',
          }}
        />

        {/* High-Performance Contrast Overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#08090D]/85 via-[#08090D]/90 to-[#08090D]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-lime-400/[0.08] via-transparent to-transparent pointer-events-none" />

        {/* Ambient Athletic Glows */}
        <div className="absolute -top-12 left-1/4 w-[450px] h-[220px] bg-lime-400/[0.12] rounded-full blur-[110px] pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-[350px] h-[200px] bg-cyan-400/[0.08] rounded-full blur-[100px] pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            {/* User Greeting & Status */}
            <div className="space-y-2 animate-fadeInUp">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-lime-400/10 border border-lime-400/30 text-lime-400 shadow-sm shadow-lime-400/20 backdrop-blur-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-ping" />
                  Centro de Comando
                </span>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                  {timeGreeting}
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white uppercase drop-shadow-md">
                Hola,{' '}
                <span className="bg-gradient-to-r from-lime-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                  {user?.name || 'Atleta'}
                </span>
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 font-medium flex items-center gap-2 drop-shadow">
                <LuZap className="w-4 h-4 text-lime-400 fill-lime-400/40" />
                <span>{greeting}</span>
              </p>
            </div>

            {/* Streak & Consistency Quick Pill */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 bg-[#11131C]/90 backdrop-blur-xl border border-white/[0.1] px-4 py-2.5 rounded-2xl shadow-2xl shadow-black/60">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <LuFlame className="w-5 h-5 fill-current animate-pulse" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Semana Actual
                  </div>
                  <div className="text-sm font-black text-white">
                    {stats?.currentWeek?.workouts || 0}{' '}
                    <span className="text-xs font-semibold text-slate-400">
                      sesiones
                    </span>
                  </div>
                </div>
              </div>

              <Link
                to="/workouts"
                className="hidden sm:inline-flex items-center gap-2 bg-lime-400 hover:bg-lime-300 text-slate-950 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-200 shadow-lg shadow-lime-400/25 active:scale-[0.98]"
              >
                <LuActivity className="w-4 h-4" />
                <span>Iniciar</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 mt-8 space-y-8">
        {/* ══════════════ 2. DOMINANT HERO ACTION: ENTRENAMIENTO DE HOY ══════════════ */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#121624] via-[#0E111C] to-[#0A0C13] border border-lime-400/30 p-6 sm:p-8 shadow-2xl shadow-lime-500/5 transition-all duration-300 hover:border-lime-400/50">
          {/* Subtle Corner Glow Accent */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-lime-400/[0.08] rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-cyan-500/[0.06] rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-4 max-w-2xl">
              {/* Top Meta Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lime-400/10 border border-lime-400/30 text-lime-400 text-xs font-black uppercase tracking-wider">
                <LuTarget className="w-3.5 h-3.5" />
                <span>Entrenamiento de Hoy</span>
              </div>

              {/* Main Headline */}
              <div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight uppercase">
                  Sesión Principal de Fuerza
                </h2>
                <p className="mt-1 text-sm sm:text-base text-slate-300 font-medium">
                  Registra tus series activas, tiempos de descanso y ajusta las cargas en tiempo real.
                </p>
              </div>

              {/* Training Specs Pills */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <div className="flex items-center gap-2 bg-[#171B2B] border border-white/10 px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-200">
                  <LuTimer className="w-4 h-4 text-cyan-400" />
                  <span>~50-60 min</span>
                </div>
                <div className="flex items-center gap-2 bg-[#171B2B] border border-white/10 px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-200">
                  <LuDumbbell className="w-4 h-4 text-lime-400" />
                  <span>Fuerza & Hipertrofia</span>
                </div>
                <div className="flex items-center gap-2 bg-[#171B2B] border border-white/10 px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-200">
                  <LuTrendingUp className="w-4 h-4 text-amber-400" />
                  <span>RPE 8.0 - 9.0</span>
                </div>
              </div>
            </div>

            {/* Dominant CTA Button */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
              <Link
                to="/workouts"
                className="group relative inline-flex items-center justify-center gap-3 bg-lime-400 hover:bg-lime-300 text-slate-950 font-black text-sm sm:text-base uppercase tracking-wider px-8 py-4 rounded-2xl shadow-xl shadow-lime-400/25 hover:shadow-lime-400/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 cursor-pointer"
              >
                <span>Comenzar Sesión</span>
                <LuArrowRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
              <Link
                to="/routines"
                className="inline-flex items-center justify-center gap-2 bg-[#171B2B] hover:bg-[#1E2338] border border-white/10 text-slate-300 hover:text-white font-bold text-xs uppercase tracking-wider px-5 py-3 rounded-xl transition-all duration-200 text-center"
              >
                <LuClipboardList className="w-4 h-4 text-slate-400" />
                <span>Ver Rutinas Guardadas</span>
              </Link>
            </div>
          </div>
        </section>

        {/* ══════════════ 3. WEEKLY CALENDAR STRIP ══════════════ */}
        <section className="bg-[#0F111A] border border-white/[0.08] rounded-2xl p-5 sm:p-6 shadow-xl shadow-black/40">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <LuCalendar className="w-4 h-4 text-lime-400" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">
                Constancia Semanal
              </h3>
            </div>
            <span className="text-[11px] font-bold text-slate-400">
              {stats?.period ? `${stats.period.from} → ${stats.period.to}` : 'Lunes a Domingo'}
            </span>
          </div>

          <div className="grid grid-cols-7 gap-2 sm:gap-3">
            {WEEK_DAYS.map((d, index) => {
              const isToday = index === currentDayIndex;
              // Check if workouts in current week count passes this day index
              const isCompleted = (stats?.currentWeek?.workouts || 0) > index;

              return (
                <div
                  key={d.key}
                  className={`flex flex-col items-center justify-center py-3 px-1 rounded-xl border transition-all duration-200 text-center ${
                    isToday
                      ? 'bg-lime-400/10 border-lime-400/70 shadow-md shadow-lime-400/10 ring-1 ring-lime-400/30'
                      : isCompleted
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-[#141622] border-white/[0.04] text-slate-500'
                  }`}
                >
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                    {d.label}
                  </span>
                  <div className="mt-1 flex items-center justify-center">
                    {isCompleted ? (
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-black">
                        <LuCheck className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                    ) : isToday ? (
                      <span className="w-5 h-5 rounded-full bg-lime-400 text-slate-950 flex items-center justify-center text-[10px] font-black">
                        •
                      </span>
                    ) : (
                      <span className="w-5 h-5 rounded-full bg-white/[0.04] text-slate-600 flex items-center justify-center text-[11px] font-bold">
                        {d.num}
                      </span>
                    )}
                  </div>
                  {isToday && (
                    <span className="mt-1 text-[9px] font-black uppercase tracking-tight text-lime-400">
                      Hoy
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ══════════════ 4. QUICK ACTIONS COMMAND GRID ══════════════ */}
        <section data-tour="dashboard-quick-actions" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Accesos de Comando
            </h2>
            <span className="text-[11px] font-semibold text-slate-400">4 módulos activos</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                to: '/workouts',
                icon: <LuActivity className="w-6 h-6" />,
                label: 'Registrar',
                desc: 'Nueva sesión de hoy',
                accentColor: 'text-lime-400',
                borderHover: 'hover:border-lime-400/50',
                bgBadge: 'bg-lime-400/10 text-lime-400 border-lime-400/20',
              },
              {
                to: '/routines',
                icon: <LuClipboardList className="w-6 h-6" />,
                label: 'Rutinas',
                desc: 'Planificación semanal',
                accentColor: 'text-cyan-400',
                borderHover: 'hover:border-cyan-400/50',
                bgBadge: 'bg-cyan-400/10 text-cyan-400 border-cyan-400/20',
              },
              {
                to: '/exercises',
                icon: <LuDumbbell className="w-6 h-6" />,
                label: 'Ejercicios',
                desc: 'Catálogo con técnica',
                accentColor: 'text-emerald-400',
                borderHover: 'hover:border-emerald-400/50',
                bgBadge: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
              },
              {
                to: '/recommendations',
                icon: <LuBot className="w-6 h-6" />,
                label: 'Entrenador IA',
                desc: 'Optimización y cargas',
                accentColor: 'text-violet-400',
                borderHover: 'hover:border-violet-400/50',
                bgBadge: 'bg-violet-400/10 text-violet-400 border-violet-400/20',
              },
            ].map((c) => (
              <Link
                key={c.to}
                to={c.to}
                className={`group relative bg-[#0F111A] rounded-2xl p-5 border border-white/[0.08] ${c.borderHover} transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/50 active:scale-[0.98] flex flex-col justify-between min-h-[140px] overflow-hidden`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`w-11 h-11 rounded-xl bg-[#141724] border border-white/5 flex items-center justify-center ${c.accentColor} transition-transform duration-200 group-hover:scale-105`}
                  >
                    {c.icon}
                  </div>
                  <LuArrowRight className="w-4 h-4 text-slate-600 transition-all duration-200 group-hover:text-white group-hover:translate-x-1" />
                </div>

                <div>
                  <h3 className="font-black text-sm uppercase tracking-wide text-white group-hover:text-white transition-colors">
                    {c.label}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5 line-clamp-1">
                    {c.desc}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ══════════════ 5. WEEKLY METRICS & STATS ══════════════ */}
        {stats && (
          <section data-tour="dashboard-weekly-summary" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LuTrendingUp className="w-4 h-4 text-lime-400" />
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Telemetría & Progreso Semanal
                </h2>
              </div>
              <span className="text-[11px] font-bold text-slate-400">
                {stats.period.from} → {stats.period.to}
              </span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={<LuCalendar className="w-4 h-4" />}
                iconColor="text-cyan-400"
                label="Sesiones"
                value={stats.currentWeek.workouts}
                unit="completadas"
              />
              <StatCard
                icon={<LuDumbbell className="w-4 h-4" />}
                iconColor="text-lime-400"
                label="Volumen Total"
                value={stats.currentWeek.totalVolume.toLocaleString()}
                unit="kg acumulados"
              />
              <StatCard
                icon={<LuTrophy className="w-4 h-4" />}
                iconColor="text-amber-400"
                label="Carga Máxima"
                value={stats.currentWeek.maxWeight}
                unit="kg levantados"
              />
              <StatCard
                icon={<LuTrendingUp className="w-4 h-4" />}
                iconColor={
                  stats.comparison.volumeChange >= 0
                    ? 'text-emerald-400'
                    : 'text-rose-400'
                }
                label="Δ vs Semana Pasada"
                value={`${stats.comparison.volumeChange >= 0 ? '+' : ''}${stats.comparison.volumeChange}%`}
                unit="de variación"
                trend={
                  stats.comparison.volumeChange > 0
                    ? 'up'
                    : stats.comparison.volumeChange < 0
                    ? 'down'
                    : 'flat'
                }
              />
            </div>

            {/* Performance Insights */}
            {stats.insights && stats.insights.length > 0 && (
              <div className="rounded-2xl bg-[#0F111A] border border-white/[0.08] p-5 sm:p-6 space-y-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-300">
                  <LuSparkles className="w-4 h-4 text-lime-400" />
                  <span>Conclusiones de Rendimiento (Insights)</span>
                </div>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {stats.insights.map((insight, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 bg-[#131622] rounded-xl px-4 py-3 border border-white/[0.05]"
                    >
                      <div className="w-6 h-6 rounded-lg bg-lime-400/10 border border-lime-400/20 flex items-center justify-center shrink-0 mt-0.5 text-lime-400">
                        <LuZap className="w-3.5 h-3.5" />
                      </div>
                      <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
                        {insight}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ══════════════ FALLBACK VACÍO ══════════════ */}
        {!stats && (
          <div className="rounded-3xl bg-[#0F111A] border border-white/[0.08] p-10 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-lime-400/10 border border-lime-400/20 text-lime-400 flex items-center justify-center mx-auto shadow-lg shadow-lime-400/5">
              <LuDumbbell className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight text-white">
                Comienza a Entrenar
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto mt-1 font-medium">
                Registra tu primera sesión para desbloquear la telemetría semanal y el análisis de cargas.
              </p>
            </div>
            <Link
              to="/workouts"
              className="inline-flex items-center gap-2 bg-lime-400 hover:bg-lime-300 text-slate-950 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 shadow-lg shadow-lime-400/20 active:scale-[0.98]"
            >
              <LuActivity className="w-4 h-4" />
              <span>Registrar Primer Entrenamiento</span>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ icon, iconColor, label, value, unit, trend }) {
  return (
    <div className="bg-[#0F111A] rounded-2xl p-5 border border-white/[0.08] hover:border-white/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/40">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-8 h-8 rounded-lg bg-[#141724] border border-white/5 flex items-center justify-center ${iconColor}`}>
          {icon}
        </div>
        {trend && (
          <div
            className={`flex items-center text-xs font-black ${
              trend === 'up'
                ? 'text-emerald-400'
                : trend === 'down'
                ? 'text-rose-400'
                : 'text-slate-500'
            }`}
          >
            {trend === 'up' ? (
              <LuChevronUp className="w-5 h-5" />
            ) : trend === 'down' ? (
              <LuChevronDown className="w-5 h-5" />
            ) : (
              <LuMinus className="w-4 h-4" />
            )}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-1.5">
        <p className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          {value}
        </p>
      </div>

      <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 mt-1">
        {label}
      </p>
      {unit && (
        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
          {unit}
        </p>
      )}
    </div>
  );
}
