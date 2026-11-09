import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LuKeyRound, LuMail, LuMailCheck, LuSend } from 'react-icons/lu';
import api from '../api/axios';
import AuthShell, { authInputClass, authButtonClass, apiErrorMessage } from '../components/auth/AuthShell';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setSentTo(email.trim());
    } catch (err) {
      toast.error(apiErrorMessage(err, 'No se pudo enviar la solicitud.'));
    } finally {
      setSending(false);
    }
  };

  if (sentTo) {
    return (
      <AuthShell icon={LuMailCheck} title="Revisa tu correo">
        <div className="space-y-4 text-sm text-zinc-300 text-center">
          <p>
            Si <span className="font-bold text-white break-all">{sentTo}</span> está registrado, te enviamos un enlace
            para elegir una nueva contraseña.
          </p>
          <p className="text-zinc-400">
            El enlace caduca en <b className="text-zinc-200">30 minutos</b>. Si no lo ves en unos minutos, mira en
            <b className="text-zinc-200"> spam</b> o promociones.
          </p>
          <button type="button" onClick={() => setSentTo('')} className="text-lime-400 hover:text-lime-300 font-bold text-xs underline-offset-4 hover:underline">
            Enviar a otro correo
          </button>
          <Link to="/login" className={`${authButtonClass} mt-2`}>
            Volver al login
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      icon={LuKeyRound}
      title="¿Olvidaste tu contraseña?"
      subtitle="Escribe el correo de tu cuenta y te enviaremos un enlace para elegir una nueva."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-[11px] font-black uppercase tracking-wider text-zinc-400">
            Correo electrónico
          </label>
          <div className="relative flex items-center group">
            <LuMail className="absolute left-4 w-5 h-5 text-zinc-500 group-focus-within:text-lime-400 pointer-events-none" />
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              placeholder="tu@correo.com"
              className={authInputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>
        <button type="submit" disabled={sending || !email.trim()} className={authButtonClass}>
          {sending ? 'Enviando…' : <>Enviar enlace <LuSend className="w-4 h-4" /></>}
        </button>
      </form>
    </AuthShell>
  );
}
