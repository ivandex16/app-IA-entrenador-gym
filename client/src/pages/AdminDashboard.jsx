import { useEffect, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  LuUsers, LuDumbbell, LuListChecks, LuShield, LuTrash2,
  LuSearch, LuCrown, LuActivity, LuCalendar, LuLoader,
  LuX,
} from 'react-icons/lu';

const LEVEL_LABELS = {
  beginner: { label: 'Principiante', color: 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' },
  intermediate: { label: 'Intermedio', color: 'text-amber-400 bg-amber-500/10 border border-amber-500/20' },
  advanced: { label: 'Avanzado', color: 'text-rose-400 bg-rose-500/10 border border-rose-500/20' },
};

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/users'),
    ])
      .then(([statsRes, usersRes]) => {
        setStats(statsRes.data);
        setUsers(usersRes.data);
      })
      .catch(() => toast.error('Error al cargar datos de administración'))
      .finally(() => setLoading(false));
  }, []);

  const handleRoleToggle = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      await api.patch(`/admin/users/${userId}/role`, { role: newRole });
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u))
      );
      toast.success(`Rol actualizado a ${newRole}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al cambiar rol');
    }
  };

  const handleDelete = async (userId, userName) => {
    if (!window.confirm(`¿Eliminar al usuario "${userName}" y todos sus datos? Esta acción es irreversible.`)) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u._id !== userId));
      toast.success('Usuario eliminado');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al eliminar usuario');
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#08090D]">
        <div className="flex flex-col items-center gap-3">
          <LuLoader className="w-9 h-9 text-lime-400 animate-spin" />
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Cargando panel...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08090D] text-zinc-100 pb-24 selection:bg-lime-400 selection:text-black">
      {/* ══════════ HERO SECTION ══════════ */}
      <div className="relative overflow-hidden border-b border-white/10 bg-zinc-950">
        <div className="absolute top-0 right-1/4 w-[450px] h-[250px] bg-lime-400/5 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-[350px] h-[200px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-4 pt-10 pb-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center text-lime-400 shadow-xl shadow-black/50">
              <LuShield className="w-6 h-6 text-lime-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-lime-400/10 border border-lime-400/30 text-lime-400 text-xs font-bold uppercase tracking-wider">
                  <LuShield className="w-3.5 h-3.5" /> Panel Maestro
                </span>
                <span className="text-[11px] font-mono text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded border border-white/5">
                  Admin Suite
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
                Panel de <span className="bg-gradient-to-r from-white via-zinc-100 to-lime-400 bg-clip-text text-transparent">Administración</span>
              </h1>
              <p className="text-zinc-400 text-sm mt-0.5">
                Gestión integral de usuarios, asignación de permisos y métricas de actividad de la plataforma.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-8 space-y-7">
        {/* ══════════ STATS CARDS ══════════ */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fadeIn">
            {[
              { label: 'Usuarios', value: stats.totalUsers, icon: LuUsers, sub: `+${stats.newUsersWeek} esta semana`, iconColor: 'text-cyan-400' },
              { label: 'Entrenamientos', value: stats.totalWorkouts, icon: LuActivity, sub: `+${stats.workoutsWeek} esta semana`, iconColor: 'text-lime-400' },
              { label: 'Rutinas', value: stats.totalRoutines, icon: LuListChecks, sub: 'creadas en plataforma', iconColor: 'text-purple-400' },
              { label: 'Ejercicios', value: stats.totalExercises, icon: LuDumbbell, sub: 'en catálogo activo', iconColor: 'text-amber-400' },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-zinc-900/60 backdrop-blur-sm rounded-2xl border border-white/5 p-5 hover:border-lime-400/30 transition-all shadow-xl group"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">{s.label}</span>
                  <div className="w-10 h-10 bg-zinc-800/80 rounded-xl border border-white/5 flex items-center justify-center shadow-inner group-hover:border-lime-400/30 transition-colors">
                    <s.icon className={`w-5 h-5 ${s.iconColor}`} />
                  </div>
                </div>
                <p className="text-3xl font-black text-white font-mono">{s.value}</p>
                <p className="text-xs text-zinc-500 font-medium mt-1">{s.sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* ══════════ USERS TABLE ══════════ */}
        <div className="bg-zinc-900/60 backdrop-blur-sm rounded-2xl border border-white/5 overflow-hidden shadow-2xl animate-fadeIn">
          {/* Table Control Bar */}
          <div className="p-5 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-lime-400/10 border border-lime-400/20 flex items-center justify-center text-lime-400">
                <LuUsers className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  Usuarios Registrados
                  <span className="bg-zinc-800 text-lime-400 px-2 py-0.5 rounded-md text-xs font-bold font-mono border border-white/5">
                    {filteredUsers.length}
                  </span>
                </h2>
              </div>
            </div>
            <div className="relative max-w-xs w-full">
              <LuSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre o email..."
                className="w-full bg-zinc-900/80 border border-white/10 rounded-xl pl-10 pr-9 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400/30 transition-colors shadow-inner font-medium"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-1 rounded-lg transition"
                  title="Limpiar búsqueda"
                >
                  <LuX className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-zinc-900/80 text-zinc-400 text-[11px] font-bold uppercase tracking-wider border-b border-white/5">
                  <th className="px-5 py-3.5">Usuario</th>
                  <th className="px-5 py-3.5">Email</th>
                  <th className="px-5 py-3.5 text-center">Nivel</th>
                  <th className="px-5 py-3.5 text-center">Rol</th>
                  <th className="px-5 py-3.5 text-center">Entrenos</th>
                  <th className="px-5 py-3.5 text-center">Registro</th>
                  <th className="px-5 py-3.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.map((u) => {
                  const lvl = LEVEL_LABELS[u.level] || LEVEL_LABELS.beginner;
                  const initials = (u.name || 'U')
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <tr key={u._id} className="hover:bg-zinc-850/50 transition-colors">
                      {/* Usuario */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {u.avatar ? (
                            <img
                              src={u.avatar}
                              alt=""
                              className="w-9 h-9 rounded-xl object-cover border border-white/10"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-white/10 flex items-center justify-center text-xs font-black text-lime-400 font-mono shadow-sm">
                              {initials}
                            </div>
                          )}
                          <div>
                            <span className="text-sm font-bold text-white block">{u.name}</span>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-5 py-3.5 text-xs text-zinc-400 font-mono">{u.email}</td>

                      {/* Nivel */}
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-md ${lvl.color}`}>
                          {lvl.label}
                        </span>
                      </td>

                      {/* Rol */}
                      <td className="px-5 py-3.5 text-center">
                        {u.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg text-lime-400 bg-lime-400/10 border border-lime-400/30">
                            <LuCrown className="w-3.5 h-3.5" /> Admin
                          </span>
                        ) : (
                          <span className="inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-md text-zinc-400 bg-zinc-800/80 border border-white/5">
                            Usuario
                          </span>
                        )}
                      </td>

                      {/* Entrenos */}
                      <td className="px-5 py-3.5 text-center text-sm font-black text-white font-mono">
                        {u.workoutCount ?? 0}
                      </td>

                      {/* Registro */}
                      <td className="px-5 py-3.5 text-center text-xs text-zinc-500 font-mono">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('es-ES') : '—'}
                      </td>

                      {/* Acciones */}
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleRoleToggle(u._id, u.role)}
                            className={`p-2 rounded-xl border transition-all ${
                              u.role === 'admin'
                                ? 'bg-zinc-800 text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10 border-white/5'
                                : 'bg-zinc-800 text-zinc-400 hover:text-lime-400 hover:bg-lime-400/10 border-white/5'
                            }`}
                            title={u.role === 'admin' ? 'Quitar privilegios de admin' : 'Promover a administrador'}
                          >
                            <LuShield className="w-4 h-4" />
                          </button>
                          {u.role !== 'admin' && (
                            <button
                              type="button"
                              onClick={() => handleDelete(u._id, u.name)}
                              className="p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 border border-white/5 transition-all"
                              title="Eliminar usuario de forma permanente"
                            >
                              <LuTrash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-white/5">
            {filteredUsers.map((u) => {
              const lvl = LEVEL_LABELS[u.level] || LEVEL_LABELS.beginner;
              const initials = (u.name || 'U')
                .split(' ')
                .map((w) => w[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);

              return (
                <div key={u._id} className="p-4 space-y-3 hover:bg-zinc-850/40 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {u.avatar ? (
                        <img src={u.avatar} alt="" className="w-10 h-10 rounded-xl object-cover border border-white/10 shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-white/10 flex items-center justify-center text-xs font-black text-lime-400 font-mono shrink-0 shadow-sm">
                          {initials}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{u.name}</p>
                        <p className="text-xs text-zinc-400 font-mono truncate">{u.email}</p>
                      </div>
                    </div>
                    {u.role === 'admin' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md text-lime-400 bg-lime-400/10 border border-lime-400/30 shrink-0">
                        <LuCrown className="w-3 h-3" /> Admin
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md text-zinc-400 bg-zinc-800/80 border border-white/5 shrink-0">
                        Usuario
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${lvl.color}`}>
                      {lvl.label}
                    </span>
                    <span className="text-zinc-400 flex items-center gap-1 font-mono text-[11px] bg-zinc-800/50 px-2 py-0.5 rounded-md border border-white/5">
                      <LuActivity className="w-3 h-3 text-lime-400" /> {u.workoutCount ?? 0} entrenos
                    </span>
                    <span className="text-zinc-500 flex items-center gap-1 font-mono text-[11px]">
                      <LuCalendar className="w-3 h-3" /> {u.createdAt ? new Date(u.createdAt).toLocaleDateString('es-ES') : '—'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                    <button
                      type="button"
                      onClick={() => handleRoleToggle(u._id, u.role)}
                      className="text-xs font-bold px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/5 transition flex items-center gap-1.5"
                    >
                      <LuShield className="w-3.5 h-3.5 text-lime-400" />
                      {u.role === 'admin' ? 'Quitar admin' : 'Hacer admin'}
                    </button>
                    {u.role !== 'admin' && (
                      <button
                        type="button"
                        onClick={() => handleDelete(u._id, u.name)}
                        className="text-xs font-bold px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition flex items-center gap-1.5 ml-auto"
                      >
                        <LuTrash2 className="w-3.5 h-3.5" />
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-16 px-4">
              <div className="w-12 h-12 rounded-2xl bg-zinc-800/80 border border-white/5 flex items-center justify-center text-zinc-500 mx-auto mb-3">
                <LuSearch className="w-6 h-6" />
              </div>
              <p className="text-white font-bold text-sm">No se encontraron usuarios</p>
              <p className="text-xs text-zinc-500 mt-1">Prueba con otro término de búsqueda o limpia el filtro.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
