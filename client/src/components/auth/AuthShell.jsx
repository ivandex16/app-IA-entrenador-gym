import { Link } from 'react-router-dom';
import { LuArrowLeft } from 'react-icons/lu';

/* Shared layout for the password recovery screens (same look as Login). */
export default function AuthShell({ icon: Icon, title, subtitle, backTo = '/login', backLabel = 'Volver al login', children }) {
  return (
    <div className="relative min-h-screen bg-[#08090D] text-zinc-100 flex items-center justify-center px-4 py-10 selection:bg-lime-400 selection:text-zinc-950 overflow-hidden">
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-lime-400/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-cyan-500/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-[440px]">
        <Link
          to={backTo}
          className="group inline-flex items-center gap-2 mb-6 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors"
        >
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-900 border border-white/5 group-hover:border-lime-400/40 group-hover:text-lime-400 transition-all">
            <LuArrowLeft className="w-4 h-4" />
          </span>
          {backLabel}
        </Link>

        <div className="relative rounded-2xl bg-zinc-900/80 border border-white/[0.08] p-7 sm:p-9 shadow-2xl shadow-black/80 backdrop-blur-xl">
          <div className="absolute top-0 left-10 right-10 h-[2px] bg-gradient-to-r from-transparent via-lime-400 to-transparent opacity-80" />
          <div className="text-center mb-7">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-zinc-800 border border-white/10 shadow-lg shadow-black/50 text-lime-400 mb-4">
              <Icon className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white uppercase">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-zinc-400">{subtitle}</p>}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export const authInputClass =
  'w-full h-12 pl-12 pr-4 bg-zinc-950/80 border border-white/[0.08] rounded-xl text-white placeholder-zinc-600 text-sm font-semibold outline-none transition-all focus:border-lime-400/70 focus:ring-4 focus:ring-lime-400/15';

export const authButtonClass =
  'w-full h-12 rounded-xl font-black text-sm uppercase tracking-wider text-zinc-950 bg-lime-400 hover:bg-lime-300 shadow-lg shadow-lime-400/25 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2';

/* Readable message from the API ({ message } or express-validator's { errors: [...] }). */
export function apiErrorMessage(err, fallback) {
  const data = err.response?.data;
  if (Array.isArray(data?.errors) && data.errors.length) return data.errors[0].msg;
  if (!err.response) return 'Sin conexión. Inténtalo de nuevo.';
  return data?.message || fallback;
}
