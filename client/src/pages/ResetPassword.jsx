import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LuLock, LuLockKeyhole, LuEye, LuEyeOff, LuCheck } from 'react-icons/lu';
import api from '../api/axios';
import AuthShell, { authInputClass, authButtonClass, apiErrorMessage } from '../components/auth/AuthShell';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [linkError, setLinkError] = useState('');

  const tooShort = password.length > 0 && password.length < 6;
  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit = password.length >= 6 && confirm === password && !saving;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    try {
      const { data } = await api.put(`/auth/reset-password/${token}`, { password });
      toast.success(data?.message || 'Contraseña restablecida');
      navigate('/login', { replace: true });
    } catch (err) {
      const message = apiErrorMessage(err, 'No se pudo restablecer la contraseña.');
      // An invalid/expired link can't be fixed by retyping: show it instead of the form.
      if (err.response?.status === 400 || /enlace/i.test(message)) setLinkError(message);
      else toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (linkError) {
    return (
      <AuthShell icon={LuLockKeyhole} title="Enlace no válido">
        <div className="space-y-5 text-center">
          <p className="text-sm text-zinc-300">{linkError}</p>
          <Link to="/forgot-password" className={authButtonClass}>Solicitar un enlace nuevo</Link>
        </div>
      </AuthShell>
    );
  }

  const field = (id, label, value, onChange, error) => (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[11px] font-black uppercase tracking-wider text-zinc-400">{label}</label>
      <div className="relative flex items-center group">
        <LuLock className="absolute left-4 w-5 h-5 text-zinc-500 group-focus-within:text-lime-400 pointer-events-none" />
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete="new-password"
          className={`${authInputClass} ${error ? 'border-red-500/60' : ''}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );

  return (
    <AuthShell icon={LuLockKeyhole} title="Nueva contraseña" subtitle="Elige una contraseña nueva para tu cuenta.">
      <form onSubmit={handleSubmit} className="space-y-5">
        {field('password', 'Nueva contraseña', password, setPassword, tooShort ? 'Mínimo 6 caracteres.' : '')}
        {field('confirm', 'Repite la contraseña', confirm, setConfirm, mismatch ? 'No coincide con la nueva contraseña.' : '')}
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="text-xs font-bold text-zinc-400 hover:text-white flex items-center gap-1.5"
          aria-pressed={visible}
        >
          {visible ? <LuEyeOff className="w-4 h-4" /> : <LuEye className="w-4 h-4" />}
          {visible ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
        </button>
        <button type="submit" disabled={!canSubmit} className={authButtonClass}>
          {saving ? 'Guardando…' : <>Guardar contraseña <LuCheck className="w-4 h-4" /></>}
        </button>
      </form>
    </AuthShell>
  );
}
