import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect, useRef } from 'react';
import {
  LuDumbbell, LuLayoutDashboard, LuListChecks, LuSword, LuSearch,
  LuTarget, LuTrendingUp, LuSparkles, LuUser, LuLogOut, LuMenu, LuX,
  LuChevronDown, LuCompass, LuShield,
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
];
{ to: '/dashboard', label: 'Inicio', icon: LuLayoutDashboard, tourId: 'nav-dashboard' },
{ to: '/routines', label: 'Rutinas', icon: LuListChecks, tourId: 'nav-routines' },
{ to: '/workouts', label: 'Entrenos', icon: LuSword, tourId: 'nav-workouts' },
{ to: '/exercises', label: 'Ejercicios', icon: LuSearch, tourId: 'nav-exercises' },
{ to: '/goals', label: 'Objetivos', icon: LuTarget, tourId: 'nav-goals' },
{ to: '/progress', label: 'Progreso', icon: LuTrendingUp, tourId: 'nav-progress' },
{ to: '/recommendations', label: 'IA', icon: LuSparkles, tourId: 'nav-ia' },
];

export default function Navbar({ onStartTour }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const profileRef = useRef(null);

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  // Scroll shadow effect
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Fetch avatar
  useEffect(() => {
    if (user) {
<<<<<<< HEAD
      api.get('/users/profile').then((r) => setAvatarUrl(r.data.avatar || '')).catch(() => { });
=======
      api.get('/users/profile').then((r) => setAvatarUrl(r.data.avatar || '')).catch(() => { });
>>>>>>> 319b4ba (Initial project import: AI gym trainer app (backend, frontend, seed, AI logic, Docker, docs))
    }
  }, [user]);

  // Close profile dropdown on click outside
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setOpen(false); setProfileOpen(false); }, [location.pathname]);

  if (!user) return null;

  const navLinks = user.role === 'admin'
    ? [...baseNavLinks, { to: '/admin', label: 'Admin', icon: LuShield, tourId: 'nav-admin' }]
    : baseNavLinks;
  const initials = (user.name || 'U').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <>
      <nav
<<<<<<< HEAD
        className={`sticky top-0 z-50 transition-all duration-300 ${scrolled
            ? 'bg-slate-900/95 backdrop-blur-xl shadow-xl shadow-black/20 border-b border-slate-700/40'
            : 'bg-slate-900/80 backdrop-blur-md border-b border-transparent'
          }`}
=======
        className={`sticky top-0 z-50 transition-all duration-300 ${scrolled
            ? 'bg-slate-900/95 backdrop-blur-xl shadow-xl shadow-black/20 border-b border-slate-700/40'
            : 'bg-slate-900/80 backdrop-blur-md border-b border-transparent'
          }`}
>>>>>>> 319b4ba (Initial project import: AI gym trainer app (backend, frontend, seed, AI logic, Docker, docs))
      >
        {/* Top accent line */}
        <div className="h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />

        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between h-16">
            {/* ── Logo ── */}
            <Link to="/dashboard" className="flex items-center gap-2.5 group" data-tour="navbar-logo">
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-indigo-700 flex items-center justify-center shadow-lg shadow-primary/25 group-hover:shadow-primary/40 transition-shadow">
                  <LuDumbbell className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -inset-1 rounded-xl bg-primary/20 blur-sm opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
              </div>
              <span className="text-lg font-black tracking-tight">
                <span className="text-white">APP</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">-GYM</span>
              </span>
            </Link>

            {/* ── Desktop Navigation ── */}
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((l) => {
                const Icon = l.icon;
                const active = isActive(l.to);
                return (
                  <Link
                    key={l.to}
                    to={l.to}
                    data-tour={l.tourId}
<<<<<<< HEAD
                    className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${active
                        ? 'text-white'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
=======
                    className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${active
                        ? 'text-white'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
>>>>>>> 319b4ba (Initial project import: AI gym trainer app (backend, frontend, seed, AI logic, Docker, docs))
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

            {/* ── Right section: Profile dropdown ── */}
            <div className="hidden lg:flex items-center gap-3">
              {/* Profile dropdown */}
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  data-tour="nav-profile"
<<<<<<< HEAD
                  className={`flex items-center gap-2 py-1.5 pl-1.5 pr-3 rounded-xl transition-all duration-200 ${profileOpen || isActive('/profile')
                      ? 'bg-white/10 ring-1 ring-primary/30'
                      : 'hover:bg-white/5'
                    }`}
=======
                  className={`flex items-center gap-2 py-1.5 pl-1.5 pr-3 rounded-xl transition-all duration-200 ${profileOpen || isActive('/profile')
                      ? 'bg-white/10 ring-1 ring-primary/30'
                      : 'hover:bg-white/5'
                    }`}
>>>>>>> 319b4ba (Initial project import: AI gym trainer app (backend, frontend, seed, AI logic, Docker, docs))
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
                        Cerrar sesión
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Mobile hamburger ── */}
            <button
              className="lg:hidden relative w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white/5 transition-colors"
              onClick={() => setOpen(!open)}
            >
              {open ? <LuX className="w-5 h-5" /> : <LuMenu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* ── Mobile menu overlay ── */}
      <div
<<<<<<< HEAD
        className={`fixed inset-0 z-40 lg:hidden transition-all duration-300 ${open ? 'visible' : 'invisible'
          }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'
            }`}
=======
        className={`fixed inset-0 z-40 lg:hidden transition-all duration-300 ${open ? 'visible' : 'invisible'
          }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'
            }`}
>>>>>>> 319b4ba (Initial project import: AI gym trainer app (backend, frontend, seed, AI logic, Docker, docs))
          onClick={() => setOpen(false)}
        />

        {/* Panel */}
        <div
<<<<<<< HEAD
          className={`absolute top-0 right-0 h-full w-72 bg-slate-900/98 backdrop-blur-xl border-l border-slate-700/50 shadow-2xl transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'
            }`}
=======
          className={`absolute top-0 right-0 h-full w-72 bg-slate-900/98 backdrop-blur-xl border-l border-slate-700/50 shadow-2xl transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'
            }`}
>>>>>>> 319b4ba (Initial project import: AI gym trainer app (backend, frontend, seed, AI logic, Docker, docs))
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
<<<<<<< HEAD
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active
                      ? 'bg-primary/10 text-white border border-primary/20'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
=======
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active
                      ? 'bg-primary/10 text-white border border-primary/20'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
>>>>>>> 319b4ba (Initial project import: AI gym trainer app (backend, frontend, seed, AI logic, Docker, docs))
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
            <Link
              to="/profile"
              onClick={() => setOpen(false)}
<<<<<<< HEAD
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive('/profile')
                  ? 'bg-primary/10 text-white border border-primary/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
=======
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive('/profile')
                  ? 'bg-primary/10 text-white border border-primary/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
>>>>>>> 319b4ba (Initial project import: AI gym trainer app (backend, frontend, seed, AI logic, Docker, docs))
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
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
