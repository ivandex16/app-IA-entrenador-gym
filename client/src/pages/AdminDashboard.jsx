import { useEffect, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  LuUsers, LuDumbbell, LuListChecks, LuShield, LuTrash2, LuSearch, LuCrown, LuActivity,
  LuCalendar, LuLoader,
} from 'react-icons/lu';

const LEVEL_LABELS = {
  beginner: { label: 'Principiante', color: 'text-emerald-400 bg-emerald-500/15' },
  intermediate: { label: 'Intermedio', color: 'text-amber-400 bg-amber-500/15' },
  advanced: { label: 'Avanzado', color: 'text-red-400 bg-red-500/15' },
};

const ROLE_LABELS = {
  user: { label: 'Usuario', color: 'text-gray-300 bg-slate-600/30' },
  trainer: { label: 'Entrenador', color: 'text-cyan-300 bg-cyan-500/15' },
  admin: { label: 'Admin', color: 'text-amber-400 bg-amber-500/15', icon: LuCrown },
};

const EMPTY_CONFIRM = {
  open: false,
  busy: false,
  title: '',
  message: '',
  tone: 'warning',
  confirmLabel: 'Confirmar',
  action: null,
};

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [seedingExercises, setSeedingExercises] = useState(false);
  const [syncingVideos, setSyncingVideos] = useState(false);
  const [tempPasswordData, setTempPasswordData] = useState(null);
  const [confirmState, setConfirmState] = useState(EMPTY_CONFIRM);

  const loadDashboardData = async () => {
    const [statsRes, usersRes] = await Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/users'),
    ]);
    setStats(statsRes.data);
    setUsers(usersRes.data);
  };

  useEffect(() => {
    Promise.all([
      loadDashboardData(),
    ])
      .catch(() => toast.error('Error al cargar datos de administracion'))
      .finally(() => setLoading(false));
  }, []);

  const handleSeedExercises = async () => {
    setSeedingExercises(true);
    try {
      const { data } = await api.post('/admin/seed-exercises');
      await loadDashboardData();
      toast.success(`${data.upserted || 0} ejercicios sincronizados. Total: ${data.totalExercises || 0}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo sincronizar el catalogo');
    } finally {
      setSeedingExercises(false);
    }
  };

  const handleSyncExerciseVideos = async () => {
    setSyncingVideos(true);
    try {
      const { data } = await api.post('/admin/fill-exercise-videos');
      await loadDashboardData();
      toast.success(`${data.updated || 0} videos agregados. Con video: ${data.withVideoUrl || 0}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudieron sincronizar los videos');
    } finally {
      setSyncingVideos(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.patch(`/admin/users/${userId}/role`, { role: newRole });
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u)),
      );
      toast.success(`Rol actualizado a ${newRole}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al cambiar rol');
    }
  };

  const handleDelete = (userId, userName) => {
    setConfirmState({
      open: true,
      busy: false,
      title: 'Eliminar usuario',
      message: `Se eliminara a "${userName}" con todos sus datos. Esta accion es irreversible.`,
      tone: 'danger',
      confirmLabel: 'Eliminar',
      action: async () => {
        await api.delete(`/admin/users/${userId}`);
        setUsers((prev) => prev.filter((u) => u._id !== userId));
        toast.success('Usuario eliminado');
      },
    });
  };

  const handleTemporaryPassword = (userId, userName) => {
    setConfirmState({
      open: true,
      busy: false,
      title: 'Generar contrasena temporal',
      message: `Se creara una contrasena temporal para "${userName}". Luego deberas compartirla manualmente con el usuario.`,
      tone: 'primary',
      confirmLabel: 'Generar',
      action: async () => {
        const { data } = await api.post(`/admin/users/${userId}/temp-password`);
        setTempPasswordData({
          name: data.user?.name || userName,
          email: data.user?.email || '',
          password: data.temporaryPassword || '',
        });
        toast.success('Contrasena temporal generada');
      },
    });
  };

  const handleCopyTemporaryPassword = async () => {
    if (!tempPasswordData?.password) return;
    try {
      await navigator.clipboard.writeText(tempPasswordData.password);
      toast.success('Contrasena copiada');
    } catch {
      toast.error('No se pudo copiar la contrasena');
    }
  };

  const handleConfirm = async () => {
    if (!confirmState.action) return;
    setConfirmState((prev) => ({ ...prev, busy: true }));
    try {
      await confirmState.action();
      setConfirmState(EMPTY_CONFIRM);
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo completar la accion');
      setConfirmState((prev) => ({ ...prev, busy: false }));
    }
  };

  const closeConfirm = () => {
    if (confirmState.busy) return;
    setConfirmState(EMPTY_CONFIRM);
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LuLoader className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-indigo-950/30 to-dark" />
        <div className="absolute top-10 right-1/4 w-[400px] h-[300px] bg-indigo-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[350px] h-[200px] bg-cyan-500/10 rounded-full blur-[100px]" />

        <div className="relative max-w-6xl mx-auto px-4 pt-12 pb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <LuShield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                Panel de <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Administracion</span>
              </h1>
              <p className="text-gray-400 text-sm">Gestion de usuarios y estadisticas de la plataforma</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-2 space-y-6">
        <div className="animate-fadeInUp bg-slate-800/70 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white">Catalogo de ejercicios</h2>
            <p className="text-sm text-gray-400">Sincroniza el seed del servidor y completa videos cortos de YouTube para los ejercicios que no tengan.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={handleSeedExercises}
              disabled={seedingExercises}
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20"
            >
              {seedingExercises ? (
                <>
                  <LuLoader className="w-4 h-4 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <LuDumbbell className="w-4 h-4" />
                  Sincronizar catalogo
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleSyncExerciseVideos}
              disabled={syncingVideos}
              className="inline-flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border border-slate-600"
            >
              {syncingVideos ? (
                <>
                  <LuLoader className="w-4 h-4 animate-spin" />
                  Buscando videos...
                </>
              ) : (
                <>
                  <LuDumbbell className="w-4 h-4" />
                  Completar videos
                </>
              )}
            </button>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fadeInUp">
            {[
              { label: 'Usuarios', value: stats.totalUsers, icon: LuUsers, color: 'from-indigo-500 to-blue-600', sub: `+${stats.newUsersWeek} esta semana` },
              { label: 'Entrenamientos', value: stats.totalWorkouts, icon: LuActivity, color: 'from-emerald-500 to-green-600', sub: `+${stats.workoutsWeek} esta semana` },
              { label: 'Rutinas', value: stats.totalRoutines, icon: LuListChecks, color: 'from-cyan-500 to-sky-600', sub: 'creadas' },
              { label: 'Ejercicios', value: stats.totalExercises, icon: LuDumbbell, color: 'from-amber-500 to-orange-600', sub: 'en catalogo' },
            ].map((s) => (
              <div key={s.label} className="bg-slate-800/80 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-5 hover:border-slate-600/70 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{s.label}</span>
                  <div className={`w-9 h-9 bg-gradient-to-br ${s.color} rounded-xl flex items-center justify-center shadow-lg`}>
                    <s.icon className="w-4 h-4 text-white" />
                  </div>
                </div>
                <p className="text-3xl font-black text-white">{s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.sub}</p>
              </div>
            ))}
          </div>
        )}

        <div className="animate-fadeInUp stagger-1 bg-slate-800/80 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden">
          <div className="p-5 border-b border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <LuUsers className="w-5 h-5 text-indigo-400" />
              Usuarios Registrados
              <span className="text-sm font-normal text-gray-500">({filteredUsers.length})</span>
            </h2>
            <div className="relative max-w-xs w-full">
              <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar usuario..."
                className="w-full bg-slate-700/60 border border-slate-600/50 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder-gray-500"
              />
            </div>
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-slate-700/30">
                  <th className="text-left px-5 py-3">Usuario</th>
                  <th className="text-left px-5 py-3">Email</th>
                  <th className="text-center px-5 py-3">Nivel</th>
                  <th className="text-center px-5 py-3">Rol</th>
                  <th className="text-center px-5 py-3">Entrenos</th>
                  <th className="text-center px-5 py-3">Registro</th>
                  <th className="text-center px-5 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {filteredUsers.map((u) => {
                  const lvl = LEVEL_LABELS[u.level] || LEVEL_LABELS.beginner;
                  return (
                    <tr key={u._id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          {u.avatar ? (
                            <img src={u.avatar} alt="" className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-600/50" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-indigo-700 flex items-center justify-center ring-1 ring-slate-600/50">
                              <span className="text-xs font-bold text-white">
                                {(u.name || 'U').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
                              </span>
                            </div>
                          )}
                          <span className="text-sm font-semibold text-white">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-400">{u.email}</td>
                      <td className="px-5 py-3 text-center">
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${lvl.color}`}>{lvl.label}</span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg ${ROLE_LABELS[u.role]?.color || ROLE_LABELS.user.color}`}>
                          {u.role === 'admin' && <LuCrown className="w-3 h-3" />}
                          {ROLE_LABELS[u.role]?.label || 'Usuario'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center text-sm font-bold text-white">{u.workoutCount}</td>
                      <td className="px-5 py-3 text-center text-xs text-gray-500">
                        {new Date(u.createdAt).toLocaleDateString('es-ES')}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {u.role !== 'admin' && (
                            <button
                              onClick={() => handleTemporaryPassword(u._id, u.name)}
                              className="px-2.5 py-1.5 rounded-lg hover:bg-cyan-500/10 text-gray-500 hover:text-cyan-400 transition-colors text-xs font-semibold"
                              title="Generar contrasena temporal"
                            >
                              Clave temp
                            </button>
                          )}
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u._id, e.target.value)}
                            className="rounded-lg border border-slate-600/50 bg-slate-700/80 px-2 py-1 text-xs text-white outline-none focus:ring-2 focus:ring-indigo-500/50"
                            title="Cambiar rol"
                          >
                            <option value="user">Usuario</option>
                            <option value="trainer">Entrenador</option>
                            <option value="admin">Admin</option>
                          </select>
                          {u.role !== 'admin' && (
                            <button
                              onClick={() => handleDelete(u._id, u.name)}
                              className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors"
                              title="Eliminar usuario"
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

          <div className="md:hidden divide-y divide-slate-700/30">
            {filteredUsers.map((u) => {
              const lvl = LEVEL_LABELS[u.level] || LEVEL_LABELS.beginner;
              return (
                <div key={u._id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {u.avatar ? (
                        <img src={u.avatar} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-indigo-700 flex items-center justify-center">
                          <span className="text-sm font-bold text-white">
                            {(u.name || 'U').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-bold text-white">{u.name}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${ROLE_LABELS[u.role]?.color || ROLE_LABELS.user.color}`}>
                      {u.role === 'admin' && <LuCrown className="w-3 h-3" />}
                      {ROLE_LABELS[u.role]?.label || 'Usuario'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${lvl.color}`}>{lvl.label}</span>
                    <span className="text-[10px] text-gray-500 flex items-center gap-1">
                      <LuActivity className="w-3 h-3" /> {u.workoutCount} entrenos
                    </span>
                    <span className="text-[10px] text-gray-500 flex items-center gap-1">
                      <LuCalendar className="w-3 h-3" /> {new Date(u.createdAt).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    {u.role !== 'admin' && (
                      <button
                        onClick={() => handleTemporaryPassword(u._id, u.name)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 transition-colors"
                      >
                        Clave temporal
                      </button>
                    )}
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u._id, e.target.value)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-slate-700/60 text-gray-200 border border-slate-600/50 outline-none"
                    >
                      <option value="user">Usuario</option>
                      <option value="trainer">Entrenador</option>
                      <option value="admin">Admin</option>
                    </select>
                    {u.role !== 'admin' && (
                      <button
                        onClick={() => handleDelete(u._id, u.name)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <LuSearch className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500">No se encontraron usuarios</p>
            </div>
          )}
        </div>
      </div>

      {tempPasswordData && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div>
              <h3 className="text-xl font-bold text-white">Contrasena temporal generada</h3>
              <p className="text-sm text-gray-400 mt-1">
                Entrega esta contrasena a {tempPasswordData.name} para que inicie sesion y luego la cambie desde su perfil.
              </p>
              <p className="text-xs text-gray-500 mt-1">{tempPasswordData.email}</p>
            </div>
            <div className="rounded-xl bg-slate-800 border border-slate-700 px-4 py-3">
              <p className="text-xs text-gray-500 mb-2">Contrasena temporal</p>
              <p className="font-mono text-lg tracking-wide text-cyan-300 break-all">{tempPasswordData.password}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCopyTemporaryPassword}
                className="flex-1 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 py-3 rounded-xl font-semibold transition-colors"
              >
                Copiar
              </button>
              <button
                onClick={() => setTempPasswordData(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-semibold transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmState.open}
        busy={confirmState.busy}
        title={confirmState.title}
        message={confirmState.message}
        tone={confirmState.tone}
        confirmLabel={confirmState.confirmLabel}
        onConfirm={handleConfirm}
        onCancel={closeConfirm}
      />
    </div>
  );
}
