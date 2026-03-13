import { LuTriangleAlert } from 'react-icons/lu';

const TONE_STYLES = {
  danger: {
    icon: 'text-red-300 bg-red-500/15 border-red-500/30',
    button: 'bg-red-500 hover:bg-red-400 text-white',
  },
  warning: {
    icon: 'text-amber-300 bg-amber-500/15 border-amber-500/30',
    button: 'bg-amber-500 hover:bg-amber-400 text-slate-950',
  },
  primary: {
    icon: 'text-cyan-300 bg-cyan-500/15 border-cyan-500/30',
    button: 'bg-cyan-500 hover:bg-cyan-400 text-slate-950',
  },
};

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'warning',
  busy = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  const styles = TONE_STYLES[tone] || TONE_STYLES.warning;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-700/70 bg-slate-900/95 shadow-2xl shadow-slate-950/50 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <div className="p-6 sm:p-7">
          <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center mb-4 ${styles.icon}`}>
            <LuTriangleAlert className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">{message}</p>
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="flex-1 rounded-2xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 disabled:opacity-60"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              className={`flex-1 rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:opacity-60 ${styles.button}`}
            >
              {busy ? 'Procesando...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
