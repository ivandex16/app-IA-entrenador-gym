import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', height: '', weight: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const extraData = {};
      if (form.height) extraData.height = Number(form.height);
      if (form.weight) extraData.weight = Number(form.weight);
      await register(form.name, form.email, form.password, extraData);
      toast.success('¡Cuenta creada!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="bg-slate-800 p-8 rounded-xl w-full max-w-md space-y-5">
        <Link to="/" className="text-sm text-gray-400 hover:text-primary transition">← Volver al inicio</Link>
        <h2 className="text-2xl font-bold text-center">Crear Cuenta</h2>
        <input
          type="text"
          placeholder="Nombre"
          required
          className="w-full bg-slate-700 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
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
          placeholder="Contraseña (mín. 6 caracteres)"
          required
          minLength={6}
          className="w-full bg-slate-700 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <div className="flex gap-3">
          <div className="flex-1">
            <input
              type="number"
              placeholder="Altura (cm)"
              min={50}
              max={300}
              className="w-full bg-slate-700 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
              value={form.height}
              onChange={(e) => setForm({ ...form, height: e.target.value })}
            />
          </div>
          <div className="flex-1">
            <input
              type="number"
              placeholder="Peso (kg)"
              min={20}
              max={500}
              step="0.1"
              className="w-full bg-slate-700 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
              value={form.weight}
              onChange={(e) => setForm({ ...form, weight: e.target.value })}
            />
          </div>
        </div>
        <p className="text-xs text-gray-500 -mt-3">Altura y peso son opcionales, pero ayudan a la IA a personalizar tus rutinas.</p>
        <button
          disabled={loading}
          className="w-full bg-primary hover:bg-indigo-600 py-3 rounded-lg font-semibold transition disabled:opacity-50"
        >
          {loading ? 'Creando…' : 'Registrarse'}
        </button>
        <p className="text-sm text-center text-gray-400">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-primary hover:underline">
            Iniciar Sesión
          </Link>
        </p>
      </form>
    </div>
  );
}
