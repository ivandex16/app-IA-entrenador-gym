import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('La contrasena debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Las contrasenas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      await api.put(`/auth/reset-password/${token}`, { password });
      toast.success('Contrasena actualizada. Ya puedes iniciar sesion.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo restablecer la contrasena.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="bg-slate-800 p-8 rounded-xl w-full max-w-md space-y-5">
        <Link to="/login" className="text-sm text-gray-400 hover:text-primary transition">Volver a login</Link>
        <h2 className="text-2xl font-bold text-center">Nueva contrasena</h2>

        <input
          type="password"
          placeholder="Nueva contrasena"
          minLength={6}
          required
          className="w-full bg-slate-700 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <input
          type="password"
          placeholder="Confirmar nueva contrasena"
          minLength={6}
          required
          className="w-full bg-slate-700 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <button
          disabled={loading}
          className="w-full bg-primary hover:bg-indigo-600 py-3 rounded-lg font-semibold transition disabled:opacity-50"
        >
          {loading ? 'Guardando...' : 'Restablecer contrasena'}
        </button>
      </form>
    </div>
  );
}

