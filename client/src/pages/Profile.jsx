import { useEffect, useState, useRef } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  LuUser, LuMail, LuShield, LuRuler, LuScale, LuCalendarDays,
  LuClock, LuSave, LuDumbbell, LuTarget, LuSparkles, LuZap,
  LuFlame, LuHeart, LuCheck, LuCircleUser, LuActivity,
  LuCamera, LuTrash2,
} from 'react-icons/lu';

const LEVELS = [
  { v: 'beginner', l: 'Principiante', icon: <LuTarget className="w-5 h-5" />, color: 'from-emerald-500 to-teal-600', border: 'border-emerald-500/50', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  { v: 'intermediate', l: 'Intermedio', icon: <LuZap className="w-5 h-5" />, color: 'from-amber-500 to-orange-600', border: 'border-amber-500/50', bg: 'bg-amber-500/10', text: 'text-amber-400' },
  { v: 'advanced', l: 'Avanzado', icon: <LuFlame className="w-5 h-5" />, color: 'from-red-500 to-rose-600', border: 'border-red-500/50', bg: 'bg-red-500/10', text: 'text-red-400' },
];

const EQUIPMENT_OPTIONS = ['barbell', 'dumbbell', 'machine', 'cables', 'bodyweight', 'bands', 'kettlebell'];
const EQ_LABELS = { barbell: 'Barra', dumbbell: 'Mancuernas', machine: 'Máquinas', cables: 'Cables', bodyweight: 'Peso corporal', bands: 'Bandas', kettlebell: 'Kettlebell' };

const MUSCLE_OPTIONS = ['chest', 'back', 'shoulders', 'legs', 'biceps', 'triceps', 'abs'];
const MG_LABELS = { chest: 'Pecho', back: 'Espalda', shoulders: 'Hombros', legs: 'Piernas', biceps: 'Bíceps', triceps: 'Tríceps', abs: 'Abdominales' };

export default function Profile() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: '',
    level: 'beginner',
    height: '',
    weight: '',
    weeklyFrequency: 3,
    availableMinutes: 60,
    preferences: { equipment: [], focusMuscleGroups: [] },
  });
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    api.get('/users/profile').then((r) => {
      const u = r.data;
      setAvatarUrl(u.avatar || '');
      setForm({
        name: u.name || '',
        level: u.level || 'beginner',
        height: u.height || '',
        weight: u.weight || '',
        weeklyFrequency: u.weeklyFrequency || 3,
        availableMinutes: u.availableMinutes || 60,
        preferences: u.preferences || { equipment: [], focusMuscleGroups: [] },
      });
    });
  }, []);

  const toggleArray = (field, value) => {
    setForm((prev) => {
      const arr = prev.preferences[field] || [];
      const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
      return { ...prev, preferences: { ...prev.preferences, [field]: next } };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/users/profile', form);
      toast.success('Perfil actualizado correctamente');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no puede superar 5 MB');
      return;
    }
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const { data } = await api.post('/users/avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAvatarUrl(data.avatar);
      toast.success('Foto de perfil actualizada');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al subir la imagen');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      await api.delete('/users/avatar');
      setAvatarUrl('');
      toast.success('Foto de perfil eliminada');
    } catch (err) {
      toast.error('Error al eliminar la foto');
    }
  };

  const currentLevel = LEVELS.find((l) => l.v === form.level) || LEVELS[0];
  const initials = (form.name || 'U').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen pb-16">
      {/* ═══════ HERO ═══════ */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/30 via-slate-900 to-purple-600/20" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />

        <div className="relative max-w-4xl mx-auto px-4 pt-10 pb-12">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Avatar */}
            <div data-tour="profile-avatar" className="relative group">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-28 h-28 rounded-2xl object-cover shadow-lg shadow-primary/20 border-2 border-slate-700/50"
                />
              ) : (
                <div className={`w-28 h-28 rounded-2xl bg-gradient-to-br ${currentLevel.color} flex items-center justify-center shadow-lg shadow-primary/20`}>
                  <span className="text-4xl font-black text-white">{initials}</span>
                </div>
              )}
              {/* Upload overlay */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all cursor-pointer"
              >
                <LuCamera className="w-7 h-7 text-white" />
              </button>
              {/* Level badge */}
              <div className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-lg ${currentLevel.bg} border-2 border-slate-900 flex items-center justify-center`}>
                {currentLevel.icon}
              </div>
              {/* Remove avatar button */}
              {avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="absolute -top-1 -left-1 w-7 h-7 rounded-lg bg-red-500/80 hover:bg-red-500 border-2 border-slate-900 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                  title="Eliminar foto"
                >
                  <LuTrash2 className="w-3.5 h-3.5 text-white" />
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
              />
              {uploadingAvatar && (
                <div className="absolute inset-0 rounded-2xl bg-black/60 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="text-center md:text-left">
              <div className="flex items-center gap-2 mb-1 justify-center md:justify-start">
                <LuCircleUser className="w-4 h-4 text-primary" />
                <span className="text-xs uppercase tracking-widest text-primary font-semibold">Mi Perfil</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-white mb-1">{form.name || 'Tu Nombre'}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400 justify-center md:justify-start">
                <span className="inline-flex items-center gap-1.5">
                  <LuMail className="w-4 h-4" />
                  {user?.email}
                </span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${currentLevel.bg} ${currentLevel.text} border ${currentLevel.border}`}>
                  {currentLevel.icon}
                  {currentLevel.l}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto px-4 mt-8 space-y-6">
        {/* ═══════ PERSONAL INFO ═══════ */}
        <div className="bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-2xl p-6" style={{ animation: 'fadeInUp 0.5s ease-out' }}>
          <h2 className="font-bold text-lg mb-5 flex items-center gap-2">
            <LuUser className="w-5 h-5 text-primary" />
            Información Personal
          </h2>
          <div className="space-y-5">
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1.5">Nombre</label>
              <input
                className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Tu nombre"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                  <LuRuler className="w-3.5 h-3.5" /> Altura (cm)
                </label>
                <input
                  type="number"
                  min={50}
                  max={300}
                  placeholder="175"
                  className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                  value={form.height}
                  onChange={(e) => setForm({ ...form, height: e.target.value ? +e.target.value : '' })}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                  <LuScale className="w-3.5 h-3.5" /> Peso (kg)
                </label>
                <input
                  type="number"
                  min={20}
                  max={500}
                  step="0.1"
                  placeholder="70"
                  className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                  value={form.weight}
                  onChange={(e) => setForm({ ...form, weight: e.target.value ? +e.target.value : '' })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ═══════ LEVEL ═══════ */}
        <div className="bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-2xl p-6" style={{ animation: 'fadeInUp 0.6s ease-out' }}>
          <h2 className="font-bold text-lg mb-5 flex items-center gap-2">
            <LuActivity className="w-5 h-5 text-cyan-400" />
            Nivel de Experiencia
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {LEVELS.map((lvl) => {
              const active = form.level === lvl.v;
              return (
                <button
                  key={lvl.v}
                  type="button"
                  onClick={() => setForm({ ...form, level: lvl.v })}
                  className={`relative overflow-hidden rounded-xl p-4 text-center border-2 transition-all ${
                    active
                      ? `${lvl.border} ${lvl.bg}`
                      : 'border-slate-700/50 bg-slate-900/40 hover:border-slate-600'
                  }`}
                >
                  {active && (
                    <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-br ${lvl.color} opacity-15 rounded-bl-full`} />
                  )}
                  <div className={`mx-auto w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${active ? lvl.bg : 'bg-slate-800'}`}>
                    <span className={active ? lvl.text : 'text-gray-500'}>{lvl.icon}</span>
                  </div>
                  <p className={`text-sm font-semibold ${active ? 'text-white' : 'text-gray-500'}`}>{lvl.l}</p>
                  {active && (
                    <div className={`absolute top-2 right-2 w-5 h-5 rounded-full bg-gradient-to-br ${lvl.color} flex items-center justify-center`}>
                      <LuCheck className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ═══════ TRAINING ═══════ */}
        <div className="bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-2xl p-6" style={{ animation: 'fadeInUp 0.7s ease-out' }}>
          <h2 className="font-bold text-lg mb-5 flex items-center gap-2">
            <LuDumbbell className="w-5 h-5 text-amber-400" />
            Configuración de Entrenamiento
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                <LuCalendarDays className="w-3.5 h-3.5" /> Días por semana
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setForm({ ...form, weeklyFrequency: d })}
                    className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${
                      form.weeklyFrequency === d
                        ? 'bg-gradient-to-br from-primary to-cyan-500 text-white shadow-lg shadow-primary/20'
                        : 'bg-slate-900/60 border border-slate-600/50 text-gray-500 hover:text-white hover:border-slate-500'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                <LuClock className="w-3.5 h-3.5" /> Minutos por sesión
              </label>
              <input
                type="number"
                min={15}
                max={300}
                className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                value={form.availableMinutes}
                onChange={(e) => setForm({ ...form, availableMinutes: +e.target.value })}
              />
              <p className="text-xs text-gray-600 mt-1.5">
                {form.availableMinutes < 30 ? 'Sesión corta' : form.availableMinutes < 60 ? 'Sesión moderada' : form.availableMinutes < 90 ? 'Sesión completa' : 'Sesión extensa'}
              </p>
            </div>
          </div>
        </div>

        {/* ═══════ EQUIPMENT ═══════ */}
        <div className="bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-2xl p-6" style={{ animation: 'fadeInUp 0.8s ease-out' }}>
          <h2 className="font-bold text-lg mb-2 flex items-center gap-2">
            <LuSparkles className="w-5 h-5 text-purple-400" />
            Equipamiento Disponible
          </h2>
          <p className="text-xs text-gray-500 mb-4">Selecciona el equipo al que tienes acceso para personalizar tus recomendaciones</p>
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT_OPTIONS.map((eq) => {
              const active = (form.preferences.equipment || []).includes(eq);
              return (
                <button
                  key={eq}
                  type="button"
                  onClick={() => toggleArray('equipment', eq)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                    active
                      ? 'bg-purple-500/15 border-purple-500/50 text-purple-300'
                      : 'bg-slate-900/40 border-slate-700/50 text-gray-500 hover:text-gray-300 hover:border-slate-600'
                  }`}
                >
                  {active && <LuCheck className="w-3.5 h-3.5 inline mr-1.5" />}
                  {EQ_LABELS[eq]}
                </button>
              );
            })}
          </div>
        </div>

        {/* ═══════ FOCUS MUSCLE GROUPS ═══════ */}
        <div className="bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-2xl p-6" style={{ animation: 'fadeInUp 0.9s ease-out' }}>
          <h2 className="font-bold text-lg mb-2 flex items-center gap-2">
            <LuHeart className="w-5 h-5 text-rose-400" />
            Grupos Musculares Prioritarios
          </h2>
          <p className="text-xs text-gray-500 mb-4">¿En qué músculos quieres enfocarte más?</p>
          <div className="flex flex-wrap gap-2">
            {MUSCLE_OPTIONS.map((mg) => {
              const active = (form.preferences.focusMuscleGroups || []).includes(mg);
              return (
                <button
                  key={mg}
                  type="button"
                  onClick={() => toggleArray('focusMuscleGroups', mg)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                    active
                      ? 'bg-rose-500/15 border-rose-500/50 text-rose-300'
                      : 'bg-slate-900/40 border-slate-700/50 text-gray-500 hover:text-gray-300 hover:border-slate-600'
                  }`}
                >
                  {active && <LuCheck className="w-3.5 h-3.5 inline mr-1.5" />}
                  {MG_LABELS[mg]}
                </button>
              );
            })}
          </div>
        </div>

        {/* ═══════ SAVE BUTTON ═══════ */}
        <div style={{ animation: 'fadeInUp 1s ease-out' }}>
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-gradient-to-r from-primary to-cyan-500 hover:shadow-lg hover:shadow-primary/25 text-white py-4 rounded-2xl font-bold text-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <LuSave className="w-5 h-5" />
            {saving ? 'Guardando…' : 'Guardar Cambios'}
          </button>
        </div>

        {/* ═══════ ACCOUNT INFO ═══════ */}
        <div className="flex items-center justify-center gap-4 text-xs text-gray-600 pb-4">
          <span className="inline-flex items-center gap-1.5">
            <LuMail className="w-3.5 h-3.5" />
            {user?.email}
          </span>
          <span className="w-1 h-1 bg-gray-700 rounded-full" />
          <span className="inline-flex items-center gap-1.5">
            <LuShield className="w-3.5 h-3.5" />
            Rol: {user?.role === 'admin' ? 'Administrador' : 'Usuario'}
          </span>
        </div>
      </form>
    </div>
  );
}
