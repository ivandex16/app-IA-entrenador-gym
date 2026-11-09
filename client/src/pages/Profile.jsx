import { useEffect, useState, useRef } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import ChangePasswordCard from '../components/profile/ChangePasswordCard';
import {
  LuUser, LuMail, LuShield, LuRuler, LuScale, LuCalendarDays,
  LuClock, LuSave, LuDumbbell, LuTarget, LuSparkles, LuZap,
  LuFlame, LuHeart, LuCheck, LuCircleUser, LuActivity,
  LuCamera, LuTrash2,
} from 'react-icons/lu';

const LEVELS = [
  { v: 'beginner', l: 'Principiante', desc: 'Menos de 6 meses entrenando', icon: <LuTarget className="w-5 h-5" /> },
  { v: 'intermediate', l: 'Intermedio', desc: '6 meses a 2 años de experiencia', icon: <LuZap className="w-5 h-5" /> },
  { v: 'advanced', l: 'Avanzado', desc: 'Más de 2 años de entrenamiento', icon: <LuFlame className="w-5 h-5" /> },
];

const EQUIPMENT_OPTIONS = ['barbell', 'dumbbell', 'machine', 'cables', 'bodyweight', 'bands', 'kettlebell'];
const EQ_LABELS = { barbell: 'Barra', dumbbell: 'Mancuernas', machine: 'Máquinas', cables: 'Cables / Poleas', bodyweight: 'Peso corporal', bands: 'Bandas', kettlebell: 'Kettlebell' };

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
    <div className="min-h-screen bg-[#08090D] text-zinc-100 pb-24 selection:bg-lime-400 selection:text-black">
      <div className="max-w-4xl mx-auto px-4 pt-8 space-y-6">
        {/* ═══════ ATHLETE PROFILE CARD ═══════ */}
        <div className="bg-zinc-900/60 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-1/4 w-80 h-80 bg-lime-400/5 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar Squircle */}
            <div data-tour="profile-avatar" className="relative group shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-24 h-24 rounded-2xl object-cover shadow-xl border-2 border-lime-400/40"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-zinc-800 border-2 border-lime-400/40 flex items-center justify-center shadow-xl text-lime-400">
                  <span className="text-3xl font-black font-mono">{initials}</span>
                </div>
              )}

              {/* Upload button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-zinc-900/90 text-white border border-white/10 hover:border-lime-400 hover:text-lime-400 shadow-lg transition-all cursor-pointer"
                title="Cambiar foto de perfil"
              >
                <LuCamera className="w-4 h-4" />
              </button>

              {/* Remove avatar button */}
              {avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="absolute -top-2 -left-2 p-1.5 rounded-xl bg-zinc-900/90 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 border border-white/10 shadow-lg transition-all"
                  title="Eliminar foto"
                >
                  <LuTrash2 className="w-3.5 h-3.5" />
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
                  <div className="w-6 h-6 border-2 border-lime-400/30 border-t-lime-400 rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="text-center sm:text-left flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 justify-center sm:justify-start">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-lime-400/10 border border-lime-400/30 text-lime-400 text-xs font-bold uppercase tracking-wider">
                  <LuCircleUser className="w-3.5 h-3.5" /> Atleta Verificado
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white capitalize tracking-tight truncate">
                {form.name || 'Atleta'}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 mt-2 justify-center sm:justify-start">
                <span className="inline-flex items-center gap-1.5 font-mono">
                  <LuMail className="w-3.5 h-3.5 text-zinc-500" />
                  {user?.email}
                </span>
                <span className="bg-lime-400/10 text-lime-400 border border-lime-400/30 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                  {currentLevel.icon}
                  <span>{currentLevel.l}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════ FORM SECTIONS ═══════ */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ═══════ INFORMACIÓN PERSONAL ═══════ */}
          <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6 shadow-xl space-y-5 animate-fadeIn">
            <h2 className="text-base font-bold text-white flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-zinc-800/80 border border-white/5 text-lime-400">
                <LuUser className="w-4 h-4" />
              </div>
              Información Personal
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase font-bold tracking-wider text-zinc-400 block mb-1.5">
                  Nombre Completo
                </label>
                <div className="bg-zinc-900/80 border border-white/10 focus-within:border-lime-400 focus-within:ring-1 focus-within:ring-lime-400/30 rounded-xl px-4 py-3 transition-colors shadow-inner">
                  <input
                    className="w-full bg-transparent text-white font-semibold text-sm outline-none placeholder-zinc-500"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Tu nombre completo"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase font-bold tracking-wider text-zinc-400 flex items-center gap-1.5 mb-1.5">
                    <LuRuler className="w-3.5 h-3.5 text-lime-400" /> Altura (cm)
                  </label>
                  <div className="bg-zinc-900/80 border border-white/10 focus-within:border-lime-400 focus-within:ring-1 focus-within:ring-lime-400/30 rounded-xl px-4 py-3 transition-colors shadow-inner flex items-center justify-between">
                    <input
                      type="number"
                      min={50}
                      max={300}
                      placeholder="175"
                      className="w-full bg-transparent text-white font-semibold text-sm outline-none placeholder-zinc-500 font-mono"
                      value={form.height}
                      onChange={(e) => setForm({ ...form, height: e.target.value ? +e.target.value : '' })}
                    />
                    <span className="text-xs text-zinc-500 font-bold uppercase font-mono">cm</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs uppercase font-bold tracking-wider text-zinc-400 flex items-center gap-1.5 mb-1.5">
                    <LuScale className="w-3.5 h-3.5 text-lime-400" /> Peso Corporal (kg)
                  </label>
                  <div className="bg-zinc-900/80 border border-white/10 focus-within:border-lime-400 focus-within:ring-1 focus-within:ring-lime-400/30 rounded-xl px-4 py-3 transition-colors shadow-inner flex items-center justify-between">
                    <input
                      type="number"
                      min={20}
                      max={500}
                      step="0.1"
                      placeholder="70"
                      className="w-full bg-transparent text-white font-semibold text-sm outline-none placeholder-zinc-500 font-mono"
                      value={form.weight}
                      onChange={(e) => setForm({ ...form, weight: e.target.value ? +e.target.value : '' })}
                    />
                    <span className="text-xs text-zinc-500 font-bold uppercase font-mono">kg</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════ NIVEL DE EXPERIENCIA ═══════ */}
          <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6 shadow-xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-zinc-800/80 border border-white/5 text-lime-400">
                  <LuActivity className="w-4 h-4" />
                </div>
                Nivel de Experiencia
              </h2>
              <span className="text-xs text-zinc-400">Selecciona tu etapa</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {LEVELS.map((lvl) => {
                const active = form.level === lvl.v;
                return (
                  <button
                    key={lvl.v}
                    type="button"
                    onClick={() => setForm({ ...form, level: lvl.v })}
                    className={`rounded-2xl p-4 transition-all text-center border cursor-pointer relative overflow-hidden flex flex-col items-center justify-center ${
                      active
                        ? 'bg-lime-400/10 border-lime-400 text-white font-bold shadow-[0_0_20px_rgba(204,255,0,0.12)] ring-1 ring-lime-400/30'
                        : 'bg-zinc-900/60 border-white/5 text-zinc-400 hover:border-white/15 hover:text-zinc-200 hover:bg-zinc-850'
                    }`}
                  >
                    {active && (
                      <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-lime-400 text-zinc-950 flex items-center justify-center shadow-sm">
                        <LuCheck className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2.5 ${active ? 'bg-lime-400/20 text-lime-400' : 'bg-zinc-800 text-zinc-400'}`}>
                      {lvl.icon}
                    </div>
                    <p className={`text-sm font-bold ${active ? 'text-white' : 'text-zinc-300'}`}>{lvl.l}</p>
                    <p className="text-xs mt-1 text-zinc-400 leading-snug">{lvl.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ═══════ CONFIGURACIÓN DE ENTRENAMIENTO ═══════ */}
          <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6 shadow-xl space-y-5 animate-fadeIn">
            <h2 className="text-base font-bold text-white flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-zinc-800/80 border border-white/5 text-lime-400">
                <LuDumbbell className="w-4 h-4" />
              </div>
              Configuración de Entrenamiento
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Días por semana */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs uppercase font-bold tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <LuCalendarDays className="w-3.5 h-3.5 text-lime-400" /> Días por semana
                  </label>
                  <span className="font-mono text-xs font-bold text-lime-400 bg-lime-400/10 px-2.5 py-0.5 rounded-md border border-lime-400/20">
                    {form.weeklyFrequency} {form.weeklyFrequency === 1 ? 'día' : 'días'}
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setForm({ ...form, weeklyFrequency: d })}
                      className={`flex-1 h-10 rounded-xl text-sm font-bold font-mono transition-all border ${
                        form.weeklyFrequency === d
                          ? 'bg-lime-400 text-black border-lime-400 shadow-md shadow-lime-400/20 scale-[1.03]'
                          : 'bg-zinc-900/80 border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-800'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Minutos por sesión */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs uppercase font-bold tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <LuClock className="w-3.5 h-3.5 text-lime-400" /> Minutos por sesión
                  </label>
                  <span className="font-mono text-xs font-bold text-lime-400 bg-lime-400/10 px-2.5 py-0.5 rounded-md border border-lime-400/20">
                    {form.availableMinutes} min
                  </span>
                </div>
                <div className="bg-zinc-900/80 border border-white/10 focus-within:border-lime-400 focus-within:ring-1 focus-within:ring-lime-400/30 rounded-xl px-4 py-2.5 transition-colors shadow-inner flex items-center justify-between">
                  <input
                    type="number"
                    min={15}
                    max={300}
                    className="w-full bg-transparent text-white font-semibold text-sm outline-none font-mono"
                    value={form.availableMinutes}
                    onChange={(e) => setForm({ ...form, availableMinutes: +e.target.value })}
                  />
                  <span className="text-xs text-zinc-500 font-bold uppercase font-mono">min</span>
                </div>
                <p className="text-[11px] font-medium text-zinc-500">
                  {form.availableMinutes < 30 ? '⚡ Sesión corta / Express' : form.availableMinutes < 60 ? '⏱️ Sesión moderada' : form.availableMinutes < 90 ? '💪 Sesión completa estándar' : '🔥 Sesión extensa de alto volumen'}
                </p>
              </div>
            </div>
          </div>

          {/* ═══════ EQUIPAMIENTO DISPONIBLE ═══════ */}
          <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6 shadow-xl space-y-3 animate-fadeIn">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-zinc-800/80 border border-white/5 text-lime-400">
                  <LuSparkles className="w-4 h-4" />
                </div>
                Equipamiento Disponible
              </h2>
              <p className="text-xs text-zinc-400 mt-1">Selecciona el equipo al que tienes acceso para personalizar tus rutinas</p>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {EQUIPMENT_OPTIONS.map((eq) => {
                const active = (form.preferences.equipment || []).includes(eq);
                return (
                  <button
                    key={eq}
                    type="button"
                    onClick={() => toggleArray('equipment', eq)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                      active
                        ? 'bg-lime-400 text-black border-lime-400 font-bold shadow-md shadow-lime-400/20 scale-[1.02]'
                        : 'bg-zinc-900/90 border-white/5 text-zinc-400 hover:text-white hover:border-white/15 hover:bg-zinc-850'
                    }`}
                  >
                    {active && <LuCheck className="w-3.5 h-3.5 stroke-[3]" />}
                    <span>{EQ_LABELS[eq]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ═══════ GRUPOS MUSCULARES PRIORITARIOS ═══════ */}
          <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6 shadow-xl space-y-3 animate-fadeIn">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-zinc-800/80 border border-white/5 text-lime-400">
                  <LuHeart className="w-4 h-4" />
                </div>
                Grupos Musculares Prioritarios
              </h2>
              <p className="text-xs text-zinc-400 mt-1">¿En qué grupos musculares buscas mayor énfasis de hipertrofia o fuerza?</p>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {MUSCLE_OPTIONS.map((mg) => {
                const active = (form.preferences.focusMuscleGroups || []).includes(mg);
                return (
                  <button
                    key={mg}
                    type="button"
                    onClick={() => toggleArray('focusMuscleGroups', mg)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                      active
                        ? 'bg-lime-400 text-black border-lime-400 font-bold shadow-md shadow-lime-400/20 scale-[1.02]'
                        : 'bg-zinc-900/90 border-white/5 text-zinc-400 hover:text-white hover:border-white/15 hover:bg-zinc-850'
                    }`}
                  >
                    {active && <LuCheck className="w-3.5 h-3.5 stroke-[3]" />}
                    <span>{MG_LABELS[mg]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ═══════ BOTÓN DE GUARDAR ═══════ */}
          <div className="pt-2 animate-fadeIn">
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-lime-400 hover:bg-lime-300 text-black py-4 rounded-2xl font-black text-base shadow-lg shadow-lime-400/25 transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <LuSave className="w-5 h-5" />
              <span>{saving ? 'Guardando cambios…' : 'Guardar Cambios del Perfil'}</span>
            </button>
          </div>

          {/* ═══════ INFORMACIÓN DE CUENTA ═══════ */}
          <div className="flex items-center justify-center gap-4 text-xs text-zinc-500 pb-4 font-mono">
            <span className="inline-flex items-center gap-1.5">
              <LuMail className="w-3.5 h-3.5" />
              {user?.email}
            </span>
            <span className="w-1 h-1 bg-zinc-700 rounded-full" />
            <span className="inline-flex items-center gap-1.5">
              <LuShield className="w-3.5 h-3.5" />
              Rol: {user?.role === 'admin' ? 'Administrador' : 'Atleta'}
            </span>
          </div>
        </form>

        {/* Separate form: changing the password doesn't depend on saving the profile */}
        <div className="mt-6">
          <ChangePasswordCard email={user?.email} />
        </div>
      </div>
    </div>
  );
}
