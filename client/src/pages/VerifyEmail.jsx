import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/axios';

export default function VerifyEmail() {
  const { token } = useParams();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Verificando tu correo...');

  useEffect(() => {
    api.get(`/auth/verify-email/${token}`)
      .then((res) => {
        setStatus('success');
        setMessage(res.data?.message || 'Correo verificado correctamente.');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.message || 'No se pudo verificar el correo.');
      });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-slate-800 p-8 rounded-xl w-full max-w-md space-y-5 text-center">
        <h2 className="text-2xl font-bold">Verificacion de correo</h2>
        <p className={status === 'success' ? 'text-emerald-400' : status === 'error' ? 'text-red-400' : 'text-gray-300'}>
          {message}
        </p>
        <Link to="/login" className="inline-block bg-primary hover:bg-indigo-600 px-5 py-2.5 rounded-lg font-semibold transition">
          Ir a iniciar sesion
        </Link>
      </div>
    </div>
  );
}

