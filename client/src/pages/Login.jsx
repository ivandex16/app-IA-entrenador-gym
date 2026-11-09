import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  LuDumbbell,
  LuMail,
  LuLock,
  LuEye,
  LuEyeOff,
  LuArrowLeft,
  LuZap,
  LuTrendingUp,
  LuShieldCheck,
  LuFlame,
} from 'react-icons/lu';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('¡Bienvenido de nuevo!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#08090D] text-slate-100 flex items-center justify-center px-4 py-10 selection:bg-lime-400 selection:text-slate-950 overflow-hidden font-sans">
      {/* ── High-Performance Ambient Glows ── */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-lime-400/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* ── Subtle Athletic Grid Pattern ── */}
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative z-10 w-full max-w-[440px]">
        {/* ── Top Bar: Return Link & Status Chip ── */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/"
            className="group inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white transition-colors duration-200"
          >
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#12141F] border border-white/5 text-slate-400 group-hover:border-lime-400/40 group-hover:text-lime-400 group-hover:-translate-x-0.5 transition-all duration-200">
              <LuArrowLeft className="w-4 h-4" />
            </span>
            <span>Inicio</span>
          </Link>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest bg-lime-400/10 border border-lime-400/25 text-lime-400 shadow-sm shadow-lime-400/10">
            <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-ping" />
            <span>Sistema Atleta</span>
          </div>
        </div>

        {/* ── Form Card ── */}
        <div className="relative rounded-2xl bg-[#0F111A]/90 border border-white/[0.08] p-7 sm:p-9 shadow-2xl shadow-black/80 backdrop-blur-xl">
          {/* Neon Accent Edge Top Line */}
          <div className="absolute top-0 left-10 right-10 h-[2px] bg-gradient-to-r from-transparent via-lime-400 to-transparent opacity-80" />

          {/* Header Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-b from-[#181B29] to-[#0E1018] border border-white/10 shadow-lg shadow-black/50 text-lime-400 mb-4 group">
              <LuDumbbell className="w-7 h-7 transform -rotate-12 transition-transform duration-300 group-hover:rotate-0 text-lime-400" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase">
              Acceso a <span className="bg-gradient-to-r from-lime-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent">Entrenamiento</span>
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-400 font-medium">
              Ingresa tus credenciales para registrar series, cargas y RPE.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-[11px] font-black uppercase tracking-wider text-slate-400"
              >
                Correo Electrónico
              </label>
              <div className="relative flex items-center group">
                <span className="absolute left-4 text-slate-500 group-focus-within:text-lime-400 transition-colors duration-200 pointer-events-none">
                  <LuMail className="w-5 h-5" />
                </span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="atleta@appgym.com"
                  required
                  autoComplete="email"
                  className="w-full h-13 pl-12 pr-4 bg-[#141724] border border-white/[0.08] rounded-xl text-white placeholder-slate-600 text-sm font-semibold outline-none transition-all duration-200 focus:border-lime-400/70 focus:bg-[#181C2C] focus:ring-4 focus:ring-lime-400/15"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-[11px] font-black uppercase tracking-wider text-slate-400"
                >
                  Contraseña
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[11px] font-bold text-zinc-400 hover:text-lime-400 transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative flex items-center group">
                <span className="absolute left-4 text-slate-500 group-focus-within:text-lime-400 transition-colors duration-200 pointer-events-none">
                  <LuLock className="w-5 h-5" />
                </span>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  required
                  minLength={6}
                  autoComplete="current-password"
                  className="w-full h-13 pl-12 pr-12 bg-[#141724] border border-white/[0.08] rounded-xl text-white placeholder-slate-600 text-sm font-semibold outline-none transition-all duration-200 focus:border-lime-400/70 focus:bg-[#181C2C] focus:ring-4 focus:ring-lime-400/15"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  className="absolute right-3.5 p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 active:scale-95 transition-all"
                >
                  {showPassword ? (
                    <LuEyeOff className="w-4 h-4 text-lime-400" />
                  ) : (
                    <LuEye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="relative w-full h-13 mt-2 rounded-xl font-black text-sm uppercase tracking-wider text-slate-950 bg-lime-400 hover:bg-lime-300 border border-lime-300 shadow-lg shadow-lime-400/25 hover:shadow-lime-400/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none disabled:transform-none flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 text-slate-950"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Iniciando sesión…</span>
                </>
              ) : (
                <>
                  <span>Entrar al Gimnasio</span>
                  <LuZap className="w-4 h-4 fill-current" />
                </>
              )}
            </button>

            {/* Registration link */}
            <div className="pt-2 text-center">
              <p className="text-xs text-slate-400 font-medium">
                ¿No tienes cuenta?{' '}
                <Link
                  to="/register"
                  className="font-bold text-lime-400 hover:text-lime-300 transition-colors underline-offset-4 hover:underline"
                >
                  Regístrate como atleta
                </Link>
              </p>
            </div>
          </form>

          {/* Athletic Performance Indicators Footer */}
          <div className="mt-8 pt-6 border-t border-white/[0.06] grid grid-cols-3 gap-2 text-center">
            <div className="flex flex-col items-center">
              <span className="flex items-center gap-1 text-[11px] font-black text-slate-200 uppercase tracking-wider">
                <LuTrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                PRs & RPE
              </span>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Progreso</span>
            </div>
            <div className="flex flex-col items-center border-x border-white/[0.08] px-1">
              <span className="flex items-center gap-1 text-[11px] font-black text-slate-200 uppercase tracking-wider">
                <LuFlame className="w-3.5 h-3.5 text-lime-400" />
                Kg / Lbs
              </span>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Cargas</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="flex items-center gap-1 text-[11px] font-black text-slate-200 uppercase tracking-wider">
                <LuShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                JWT Auth
              </span>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Seguro</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
