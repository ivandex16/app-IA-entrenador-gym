import { useState } from 'react';
import toast from 'react-hot-toast';
import { LuLock, LuEye, LuEyeOff, LuKeyRound } from 'react-icons/lu';
import api from '../../api/axios';

const EMPTY = { currentPassword: '', newPassword: '', confirmPassword: '' };

/* Readable message from the API ({ message } or express-validator's { errors: [...] }). */
function errorMessage(err) {
  const data = err.response?.data;
  if (Array.isArray(data?.errors) && data.errors.length) return data.errors[0].msg;
  if (!err.response) return 'Sin conexión. Inténtalo de nuevo.';
  return data?.message || 'No se pudo cambiar la contraseña.';
}

function PasswordField({ label, value, onChange, autoComplete, visible, error }) {
  return (
    <div>
      <label className="text-xs uppercase font-bold tracking-wider text-zinc-400 block mb-1.5">{label}</label>
      <div
        className={`bg-zinc-900/80 border rounded-xl px-4 py-3 transition-colors shadow-inner focus-within:ring-1 ${
          error
            ? 'border-red-500/60 focus-within:ring-red-500/30'
            : 'border-white/10 focus-within:border-lime-400 focus-within:ring-lime-400/30'
        }`}
      >
        <input
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          className="w-full bg-transparent text-white font-semibold text-sm outline-none placeholder-zinc-500"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
        />
      </div>
      {error && <p className="text-xs text-red-400 mt-1.5">{error}</p>}
    </div>
  );
}

/* Change the password of the logged-in user (asks for the current one). */
export default function ChangePasswordCard({ email }) {
  const [form, setForm] = useState(EMPTY);
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const tooShort = form.newPassword.length > 0 && form.newPassword.length < 6;
  const mismatch = form.confirmPassword.length > 0 && form.confirmPassword !== form.newPassword;
  const canSubmit =
    form.currentPassword && form.newPassword.length >= 6 && form.confirmPassword === form.newPassword && !saving;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    try {
      const { data } = await api.put('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      toast.success(data?.message || 'Contraseña actualizada');
      setForm(EMPTY);
      setVisible(false);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6 shadow-xl space-y-5 animate-fadeIn"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-white flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-zinc-800/80 border border-white/5 text-lime-400">
            <LuLock className="w-4 h-4" />
          </div>
          Cambiar Contraseña
        </h2>
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="text-xs font-bold text-zinc-400 hover:text-white flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition"
          aria-pressed={visible}
        >
          {visible ? <LuEyeOff className="w-4 h-4" /> : <LuEye className="w-4 h-4" />}
          {visible ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>

      {/* Lets password managers associate the new password with this account */}
      <input type="email" name="username" autoComplete="username" value={email || ''} readOnly hidden />

      <div className="space-y-4">
        <PasswordField
          label="Contraseña actual"
          value={form.currentPassword}
          onChange={set('currentPassword')}
          autoComplete="current-password"
          visible={visible}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PasswordField
            label="Nueva contraseña"
            value={form.newPassword}
            onChange={set('newPassword')}
            autoComplete="new-password"
            visible={visible}
            error={tooShort ? 'Mínimo 6 caracteres.' : ''}
          />
          <PasswordField
            label="Repite la nueva contraseña"
            value={form.confirmPassword}
            onChange={set('confirmPassword')}
            autoComplete="new-password"
            visible={visible}
            error={mismatch ? 'No coincide con la nueva contraseña.' : ''}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <LuKeyRound className="w-4 h-4 text-lime-400" />
        {saving ? 'Actualizando…' : 'Actualizar contraseña'}
      </button>
    </form>
  );
}
