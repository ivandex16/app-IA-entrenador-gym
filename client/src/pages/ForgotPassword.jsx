import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const normalized = email.trim();
    if (!EMAIL_REGEX.test(normalized)) {
      toast.error('Ingresa un correo valido.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', {
        email: normalized,
      });
      setDevResetUrl(data?.resetUrl || '');
      toast.success(data?.message || 'Revisa tu correo para continuar.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo procesar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="bg-slate-800 p-8 rounded-xl w-full max-w-md space-y-5">
        <Link to="/login" className="text-sm text-gray-400 hover:text-primary transition">Volver a login</Link>
        <h2 className="text-2xl font-bold text-center">Recuperar contrasena</h2>
        <p className="text-sm text-gray-400 text-center">
          Ingresa tu correo y te enviaremos un enlace para restablecer tu contrasena.
        </p>

        <input
          type="email"
          placeholder="Correo electronico"
          required
          className="w-full bg-slate-700 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button
          disabled={loading}
          className="w-full bg-primary hover:bg-indigo-600 py-3 rounded-lg font-semibold transition disabled:opacity-50"
        >
          {loading ? 'Enviando...' : 'Enviar instrucciones'}
        </button>

        {devResetUrl && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
            <p className="text-xs text-amber-300 mb-2">Modo desarrollo: enlace de recuperacion</p>
            <a href={devResetUrl} className="text-xs text-primary break-all hover:underline">{devResetUrl}</a>
          </div>
        )}
      </form>
    </div>
  );
}

