import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="bg-slate-800 p-8 rounded-xl w-full max-w-md space-y-5">
        <Link to="/" className="text-sm text-gray-400 hover:text-primary transition">← Volver al inicio</Link>
        <h2 className="text-2xl font-bold text-center">Iniciar Sesión</h2>
        <input
          type="email"
          placeholder="Correo electrónico"
          required
          className="w-full bg-slate-700 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          type="password"
          placeholder="Contraseña"
          required
          minLength={6}
          className="w-full bg-slate-700 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <button
          disabled={loading}
          className="w-full bg-primary hover:bg-indigo-600 py-3 rounded-lg font-semibold transition disabled:opacity-50"
        >
          {loading ? 'Iniciando sesión…' : 'Entrar'}
        </button>
        <p className="text-sm text-center text-gray-400">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="text-primary hover:underline">
            Regístrate
          </Link>
        </p>
      </form>
    </div>
  );
}
