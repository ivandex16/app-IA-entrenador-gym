import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect, useRef } from 'react';
import {
  LuDumbbell, LuLayoutDashboard, LuListChecks, LuSword, LuSearch,
  LuTarget, LuTrendingUp, LuSparkles, LuUser, LuLogOut, LuMenu, LuX,
  LuChevronDown, LuCompass, LuShield, LuUsers, LuBell,
  LuChefHat, LuTrash2,
} from 'react-icons/lu';
import api from '../api/axios';

const baseNavLinks = [
  { to: '/dashboard', label: 'Inicio', icon: LuLayoutDashboard, tourId: 'nav-dashboard' },
  { to: '/routines', label: 'Rutinas', icon: LuListChecks, tourId: 'nav-routines' },
  { to: '/workouts', label: 'Entrenos', icon: LuSword, tourId: 'nav-workouts' },
  { to: '/exercises', label: 'Ejercicios', icon: LuSearch, tourId: 'nav-exercises' },
  { to: '/goals', label: 'Objetivos', icon: LuTarget, tourId: 'nav-goals' },
  { to: '/progress', label: 'Progreso', icon: LuTrendingUp, tourId: 'nav-progress' },
  { to: '/recommendations', label: 'IA', icon: LuSparkles, tourId: 'nav-ia' },
  { to: '/fit-recipes', label: 'Recetas Fit', icon: LuChefHat, tourId: 'nav-fit-recipes' },
];

export default function Navbar({ onStartTour }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const profileRef = useRef(null);
  const notificationsRef = useRef(null);

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/notifications?limit=8');
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  // Scroll shadow effect
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Fetch avatar
  useEffect(() => {
    if (user) {
      api.get('/users/profile').then((r) => setAvatarUrl(r.data.avatar || '')).catch(() => { });
      fetchNotifications();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;
    const timer = window.setInterval(fetchNotifications, 30000);
    return () => window.clearInterval(timer);
  }, [user]);

  // Close profile dropdown on click outside
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (notificationsRef.current && !notificationsRef.current.contains(e.target)) setNotificationsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setOpen(false); setProfileOpen(false); setNotificationsOpen(false); }, [location.pathname]);

  if (!user) return null;

  const navLinks = [
    ...baseNavLinks,
    ...((user.role === 'trainer' || user.role === 'admin')
      ? [{ to: '/coaching', label: 'Coaching', icon: LuUsers, tourId: 'nav-coaching' }]
      : []),
    ...(user.role === 'admin'
      ? [{ to: '/admin', label: 'Admin', icon: LuShield, tourId: 'nav-admin' }]
      : []),
  ];
  const initials = (user.name || 'U').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.readAt) {
        await api.patch(`/notifications/${notification._id}/read`);
        setNotifications((prev) =>
          prev.map((item) =>
            item._id === notification._id ? { ...item, readAt: new Date().toISOString() } : item,
          ),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch { }

    setNotificationsOpen(false);
    navigate(notification.entityType === 'routine' ? '/routines' : '/dashboard');
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
      setUnreadCount(0);
    } catch { }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      const removed = notifications.find((item) => item._id === notificationId);
      await api.delete(`/notifications/${notificationId}`);
      setNotifications((prev) => prev.filter((item) => item._id !== notificationId));
      if (removed && !removed.readAt) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch { }
  };

  const handleDeleteAllNotifications = async () => {
    try {
      await api.delete('/notifications');
      setNotifications([]);
      setUnreadCount(0);
    } catch { }
  };

  return (
    <>
      <nav
        className={`sticky top-0 z-50 transition-all duration-300 ${scrolled
            ? 'bg-slate-900/95 backdrop-blur-xl shadow-xl shadow-black/20 border-b border-slate-700/40'
            : 'bg-slate-900/80 backdrop-blur-md border-b border-transparent'
          }`}
      >
        {/* Top accent line */}
        <div className="h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />

        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between h-16">
            {/* â”€â”€ Logo â”€â”€ */}
            <Link to="/dashboard" className="flex items-center gap-2.5 group" data-tour="navbar-logo">
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-indigo-700 flex items-center justify-center shadow-lg shadow-primary/25 group-hover:shadow-primary/40 transition-shadow">
                  <LuDumbbell className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -inset-1 rounded-xl bg-primary/20 blur-sm opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
              </div>
              <span className="text-lg font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                StephFit
              </span>
            </Link>

            {/* â”€â”€ Desktop Navigation â”€â”€ */}
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((l) => {
                const Icon = l.icon;
                const active = isActive(l.to);
                return (
                  <Link
                    key={l.to}
                    to={l.to}
                    data-tour={l.tourId}
                    className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${active
                        ? 'text-white'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? 'text-primary' : ''}`} />
                    <span>{l.label}</span>
                    {active && (
                      <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-gradient-to-r from-primary to-accent" />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* â”€â”€ Right section: Profile dropdown â”€â”€ */}
            <div className="hidden lg:flex items-center gap-3">
              <div className="relative" ref={notificationsRef}>
                <button
                  onClick={() => setNotificationsOpen((prev) => !prev)}
                  className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${notificationsOpen ? 'bg-white/10 ring-1 ring-primary/30' : 'hover:bg-white/5'}`}
                >
                  <LuBell className="w-5 h-5 text-slate-300" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-96 rounded-2xl bg-slate-800/95 backdrop-blur-xl border border-slate-700/60 shadow-2xl shadow-black/40 overflow-hidden">
                    <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-700/50">
                      <div>
                        <p className="text-sm font-semibold text-white">Notificaciones</p>
                        <p className="text-xs text-slate-400">Avisos internos de la aplicacion</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {unreadCount > 0 && (
                          <button onClick={handleMarkAllRead} className="text-xs font-semibold text-cyan-300 hover:text-cyan-200">
                            Marcar todo
                          </button>
                        )}
                        {notifications.length > 0 && (
                          <button onClick={handleDeleteAllNotifications} className="text-xs font-semibold text-rose-300 hover:text-rose-200">
                            Limpiar todo
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="max-h-96 overflow-auto">
                      {notifications.length ? notifications.map((notification) => (
                        <div
                          key={notification._id}
                          className={`px-4 py-3 border-b border-slate-700/40 ${notification.readAt ? '' : 'bg-cyan-500/5'}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <button
                              onClick={() => handleNotificationClick(notification)}
                              className="flex-1 text-left rounded-xl p-1 -m-1 hover:bg-white/5 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-white">{notification.title}</p>
                                  <p className="text-xs text-slate-400 mt-1">{notification.message}</p>
                                </div>
                                {!notification.readAt && <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />}
                              </div>
                              <p className="text-[11px] text-slate-500 mt-2">
                                {new Date(notification.createdAt).toLocaleString('es-CO')}
                              </p>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteNotification(notification._id)}
                              className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-rose-500/10 hover:text-rose-300"
                              aria-label="Quitar notificacion"
                              title="Quitar notificacion"
                            >
                              <LuTrash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )) : (
                        <div className="px-4 py-6 text-sm text-slate-400">
                          No tienes notificaciones por ahora.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Profile dropdown */}
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  data-tour="nav-profile"
                  className={`flex items-center gap-2 py-1.5 pl-1.5 pr-3 rounded-xl transition-all duration-200 ${profileOpen || isActive('/profile')
                      ? 'bg-white/10 ring-1 ring-primary/30'
                      : 'hover:bg-white/5'
                    }`}
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt=""
                      className="w-8 h-8 rounded-lg object-cover ring-2 ring-slate-600/50"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-indigo-700 flex items-center justify-center ring-2 ring-slate-600/50">
                      <span className="text-xs font-bold text-white">{initials}</span>
                    </div>
                  )}
                  <span className="text-sm font-medium text-slate-200 max-w-[100px] truncate">
                    {user.name?.split(' ')[0] || 'Usuario'}
                  </span>
                  <LuChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown */}
                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl bg-slate-800/95 backdrop-blur-xl border border-slate-700/60 shadow-2xl shadow-black/40 overflow-hidden animate-[fadeIn_0.15s_ease-out]">
                    <div className="p-3 border-b border-slate-700/50">
                      <p className="text-sm font-semibold text-white truncate">{user.name || 'Usuario'}</p>
                      <p className="text-xs text-slate-400 truncate">{user.email || ''}</p>
                    </div>
                    <div className="p-1.5">
                      <Link
                        to="/profile"
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                      >
                        <LuUser className="w-4 h-4 text-primary" />
                        Mi Perfil
                      </Link>
                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          onStartTour?.();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-accent hover:bg-accent/10 hover:text-accent transition-colors"
                      >
                        <LuCompass className="w-4 h-4" />
                        Repetir tour
                      </button>
                      <button
                        onClick={() => {
                          logout();
                          navigate('/login');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                      >
                        <LuLogOut className="w-4 h-4" />
                        Cerrar sesion
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* â”€â”€ Mobile hamburger â”€â”€ */}
            <button
              type="button"
              aria-label={open ? 'Cerrar menu' : 'Abrir menu'}
              className="lg:hidden relative z-[60] shrink-0 w-10 h-10 rounded-xl border border-slate-700/60 bg-slate-800/40 text-slate-100 flex items-center justify-center hover:bg-slate-700/50 hover:text-white transition-colors"
              onClick={() => setOpen(!open)}
            >
              {open ? <LuX className="w-5 h-5 shrink-0" /> : <LuMenu className="w-5 h-5 shrink-0" />}
            </button>
          </div>
        </div>
      </nav>

      {/* â”€â”€ Mobile menu overlay â”€â”€ */}
      <div
        className={`fixed inset-0 z-40 lg:hidden transition-all duration-300 ${open ? 'visible' : 'invisible'
          }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'
            }`}
          onClick={() => setOpen(false)}
        />

        {/* Panel */}
        <div
          className={`absolute top-0 right-0 h-full w-72 bg-slate-900/98 backdrop-blur-xl border-l border-slate-700/50 shadow-2xl transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'
            }`}
        >
          {/* Close button */}
          <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
            <span className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Menú</span>
            <button
              onClick={() => setOpen(false)}
              className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center transition-colors"
            >
              <LuX className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* User card */}
          <div className="p-4 border-b border-slate-700/50">
            <div className="flex items-center gap-3">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="w-11 h-11 rounded-xl object-cover ring-2 ring-slate-600/50"
                />
              ) : (
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-indigo-700 flex items-center justify-center ring-2 ring-slate-600/50">
                  <span className="text-sm font-bold text-white">{initials}</span>
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user.name || 'Usuario'}</p>
                <p className="text-xs text-slate-400 truncate">{user.email || ''}</p>
              </div>
            </div>
          </div>

          {/* Nav links */}
          <div className="p-3 space-y-0.5">
            <p className="px-3 py-2 text-[11px] uppercase tracking-widest text-slate-500 font-semibold">Navegación</p>
            {navLinks.map((l, i) => {
              const Icon = l.icon;
              const active = isActive(l.to);
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active
                      ? 'bg-primary/10 text-white border border-primary/20'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <Icon className={`w-4.5 h-4.5 ${active ? 'text-primary' : 'text-slate-500'}`} />
                  {l.label}
                  {active && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-lg shadow-primary/50" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Bottom actions */}
          <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-slate-700/50 bg-slate-900/50 space-y-1">
            <button
              onClick={() => setNotificationsOpen((prev) => !prev)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-white/5 transition-all"
            >
              <LuBell className="w-4.5 h-4.5 text-primary" />
              Notificaciones
              {unreadCount > 0 && (
                <span className="ml-auto min-w-[20px] h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {notificationsOpen && (
              <div className="rounded-xl bg-slate-800/80 border border-slate-700/50 overflow-hidden max-h-56 overflow-auto">
                {notifications.length > 0 && (
                  <div className="flex items-center justify-end gap-3 px-3 py-2 border-b border-slate-700/40">
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead} className="text-xs font-semibold text-cyan-300 hover:text-cyan-200">
                        Marcar todo
                      </button>
                    )}
                    <button onClick={handleDeleteAllNotifications} className="text-xs font-semibold text-rose-300 hover:text-rose-200">
                      Limpiar todo
                    </button>
                  </div>
                )}
                {notifications.length ? notifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={`px-3 py-3 border-b border-slate-700/40 ${notification.readAt ? 'text-slate-300' : 'text-white bg-cyan-500/5'}`}
                  >
                    <div className="flex items-start gap-2">
                      <button
                        onClick={() => {
                          setOpen(false);
                          handleNotificationClick(notification);
                        }}
                        className="flex-1 text-left"
                      >
                        <p className="text-sm font-semibold">{notification.title}</p>
                        <p className="text-xs text-slate-400 mt-1">{notification.message}</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteNotification(notification._id)}
                        className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-300"
                        aria-label="Quitar notificacion"
                      >
                        <LuTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )) : (
                  <div className="px-3 py-4 text-xs text-slate-400">No tienes notificaciones por ahora.</div>
                )}
              </div>
            )}
            <Link
              to="/profile"
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive('/profile')
                  ? 'bg-primary/10 text-white border border-primary/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
            >
              <LuUser className="w-4.5 h-4.5 text-primary" />
              Mi Perfil
            </Link>
            <button
              onClick={() => {
                setOpen(false);
                onStartTour?.();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-accent hover:bg-accent/10 transition-all"
            >
              <LuCompass className="w-4.5 h-4.5" />
              Repetir tour
            </button>
            <button
              onClick={() => {
                logout();
                navigate('/login');
                setOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all"
            >
              <LuLogOut className="w-4.5 h-4.5" />
              Cerrar sesion
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

