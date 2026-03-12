import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({ email: '', password: '', form: '' });
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const nextErrors = { email: '', password: '' };
    const email = form.email.trim();

    if (!email) {
      nextErrors.email = 'El correo es obligatorio.';
    } else if (!EMAIL_REGEX.test(email)) {
      nextErrors.email = 'Ingresa un correo valido.';
    }

    if (!form.password) {
      nextErrors.password = 'La contrasena es obligatoria.';
    } else if (form.password.length < 6) {
      nextErrors.password = 'La contrasena debe tener al menos 6 caracteres.';
    }

    return nextErrors;
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '', form: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validateForm();
    if (validationErrors.email || validationErrors.password) {
      setErrors((prev) => ({ ...prev, ...validationErrors, form: '' }));
      return;
    }

    setLoading(true);
    try {
      await login(form.email.trim(), form.password);
      toast.success('Bienvenido de nuevo.');
      navigate('/dashboard');
    } catch (err) {
      const status = err.response?.status;
      const apiMessage = err.response?.data?.message;

      let message = 'No pudimos iniciar sesion. Intenta de nuevo.';
      if (status === 401) {
        message = 'Correo o contrasena incorrectos. Verifica tus datos.';
      } else if (status === 403) {
        message = apiMessage || 'Debes verificar tu correo antes de iniciar sesion.';
      } else if (status === 422) {
        message = apiMessage || 'Revisa los datos ingresados.';
      } else if (status === 429) {
        message = 'Demasiados intentos. Espera un momento e intenta otra vez.';
      } else if (!err.response) {
        message = 'No hay conexion con el servidor. Revisa tu internet.';
      } else if (apiMessage) {
        message = apiMessage;
      }

      setErrors((prev) => ({ ...prev, form: message }));
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="bg-slate-800 p-8 rounded-xl w-full max-w-md space-y-5">
        <Link to="/" className="text-sm text-gray-400 hover:text-primary transition">Volver al inicio</Link>
        <h2 className="text-2xl font-bold text-center">Iniciar sesion</h2>

        <div className="space-y-2">
          <input
            type="email"
            placeholder="Correo electronico"
            required
            className={`w-full bg-slate-700 rounded-lg px-4 py-3 outline-none focus:ring-2 ${errors.email ? 'ring-2 ring-red-500 focus:ring-red-500' : 'focus:ring-primary'}`}
            value={form.email}
            onChange={(e) => handleChange('email', e.target.value)}
            aria-invalid={Boolean(errors.email)}
          />
          {errors.email && <p className="text-sm text-red-400">{errors.email}</p>}
        </div>

        <div className="space-y-2">
          <input
            type="password"
            placeholder="Contrasena"
            required
            minLength={6}
            className={`w-full bg-slate-700 rounded-lg px-4 py-3 outline-none focus:ring-2 ${errors.password ? 'ring-2 ring-red-500 focus:ring-red-500' : 'focus:ring-primary'}`}
            value={form.password}
            onChange={(e) => handleChange('password', e.target.value)}
            aria-invalid={Boolean(errors.password)}
          />
          {errors.password && <p className="text-sm text-red-400">{errors.password}</p>}
        </div>

        {errors.form && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
            {errors.form}
          </p>
        )}

        <button
          disabled={loading}
          className="w-full bg-primary hover:bg-indigo-600 py-3 rounded-lg font-semibold transition disabled:opacity-50"
        >
          {loading ? 'Iniciando sesion...' : 'Entrar'}
        </button>

        <p className="text-sm text-center">
          <Link to="/forgot-password" className="text-primary hover:underline">
            Olvide mi contrasena
          </Link>
        </p>

        <p className="text-sm text-center text-gray-400">
          No tienes cuenta?{' '}
          <Link to="/register" className="text-primary hover:underline">
            Registrate
          </Link>
        </p>
      </form>
    </div>
  );
}
