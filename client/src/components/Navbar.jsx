import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect, useRef } from 'react';
import {
  LuDumbbell, LuLayoutDashboard, LuListChecks, LuSword, LuSearch,
  LuTarget, LuTrendingUp, LuSparkles, LuUser, LuLogOut, LuMenu, LuX,
  LuChevronDown, LuCompass, LuShield, LuLayoutGrid,
} from 'react-icons/lu';
import api from '../api/axios';

const baseNavLinks = [
  { to: '/dashboard', label: 'Inicio', icon: LuLayoutDashboard, tourId: 'nav-dashboard' },
  { to: '/routines', label: 'Rutinas', icon: LuListChecks, tourId: 'nav-routines' },
  { to: '/workouts', label: 'Entrenos', icon: LuSword, tourId: 'nav-workouts' },
  { to: '/exercises', label: 'Ejercicios', icon: LuSearch, tourId: 'nav-exercises' },
  { to: '/goals', label: 'Objetivos', icon: LuTarget, tourId: 'nav-goals' },
  { to: '/progress', label: 'Progreso', icon: LuTrendingUp, tourId: 'nav-progress' },
  { to: '/recommendations', label: 'IA Coach', icon: LuSparkles, tourId: 'nav-ia' },
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

  // Scroll shadow & elevation effect
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Fetch avatar
  useEffect(() => {
    if (user) {
      api.get('/users/profile').then((r) => setAvatarUrl(r.data.avatar || '')).catch(() => { });
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

  // Close menus on route change
  useEffect(() => {
    setOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  if (!user) return null;

  const navLinks = user.role === 'admin'
    ? [...baseNavLinks, { to: '/admin', label: 'Admin', icon: LuShield, tourId: 'nav-admin' }]
    : baseNavLinks;
  const initials = (user.name || 'U').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <>
      {/* ── TOP STICKY NAVBAR (Desktop & Mobile Header) ── */}
      <nav
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-[#090A0F]/90 backdrop-blur-xl shadow-2xl shadow-black/70 border-b border-white/[0.08]'
            : 'bg-[#090A0F]/75 backdrop-blur-md border-b border-white/[0.04]'
        }`}
      >
        {/* Athletic High-Energy Accent Top Line */}
        <div className="h-[2px] bg-gradient-to-r from-transparent via-lime-400/80 to-transparent" />

        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between gap-3 lg:gap-4 h-16">

            {/* ── 1. Brand Logo & Badge (Protected with shrink-0 & clear margin) ── */}
            <Link
              to="/dashboard"
              className="flex items-center gap-2 group select-none active:scale-95 transition-transform shrink-0 mr-1 sm:mr-2"
              data-tour="navbar-logo"
            >
              <div className="relative">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-lime-400 via-lime-300 to-emerald-400 flex items-center justify-center shadow-lg shadow-lime-400/25 group-hover:shadow-lime-400/40 group-hover:scale-105 transition-all duration-200">
                  <LuDumbbell className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-black stroke-[2.5]" />
                </div>
                <div className="absolute -inset-1 rounded-xl bg-lime-400/20 blur-sm opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg font-black tracking-tight text-white whitespace-nowrap">
                  APP<span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-emerald-400">-GYM</span>
                </span>
                <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-mono font-extrabold uppercase tracking-widest bg-lime-400/10 text-lime-400 border border-lime-400/20">
                  PRO
                </span>
              </div>
            </Link>

            {/* ── 2. Desktop Navigation Links (Responsive, no-scrollbar, compact gaps) ── */}
            <div className="hidden lg:flex items-center gap-1 xl:gap-1.5 flex-1 min-w-0 justify-center overflow-x-auto no-scrollbar py-1 px-1">
              {navLinks.map((l) => {
                const Icon = l.icon;
                const active = isActive(l.to);
                const isAI = l.to === '/recommendations';

                return (
                  <Link
                    key={l.to}
                    to={l.to}
                    data-tour={l.tourId}
                    className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium tracking-wide whitespace-nowrap transition-all duration-150 active:scale-95 select-none shrink-0 ${
                      active
                        ? 'text-lime-400 bg-lime-400/10 border border-lime-400/30 font-semibold shadow-sm'
                        : 'text-zinc-400 hover:text-white hover:bg-white/[0.05] border border-transparent'
                    }`}
                  >
                    <Icon
                      className={`w-3.5 h-3.5 xl:w-4 xl:h-4 transition-colors duration-200 shrink-0 ${
                        active
                          ? 'text-lime-400'
                          : isAI
                          ? 'text-cyan-400'
                          : 'text-zinc-400 group-hover:text-zinc-200'
                      }`}
                    />
                    <span>{l.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* ── 3. Right Section: Profile Dropdown (Protected with shrink-0) ── */}
            <div className="flex items-center gap-2 shrink-0 ml-1 sm:ml-2">
              {/* Profile Dropdown */}
              <div className="relative shrink-0" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  data-tour="nav-profile"
                  className={`flex items-center gap-2 py-1 px-2 rounded-xl border transition-all duration-200 active:scale-95 shrink-0 ${
                    profileOpen || isActive('/profile')
                      ? 'bg-white/10 border-lime-400/40 text-white shadow-[0_0_12px_rgba(163,230,53,0.15)]'
                      : 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.07] hover:border-white/20 text-zinc-300'
                  }`}
                  aria-label="Menú de perfil"
                >
                  <div className="relative shrink-0">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Avatar"
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-cover ring-1 ring-lime-400/40"
                      />
                    ) : (
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-lime-400 via-emerald-400 to-cyan-400 flex items-center justify-center font-black text-xs text-black shadow-sm">
                        {initials}
                      </div>
                    )}
                    {/* Live Online Dot */}
                    <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-lime-400 ring-2 ring-[#090A0F]" />
                  </div>

                  {/* Athlete Name & Email Display */}
                  <div className="hidden sm:flex flex-col items-start text-left leading-tight min-w-0">
                    <span className="text-xs font-semibold text-zinc-100 max-w-[85px] xl:max-w-[130px] truncate">
                      {user.name || 'Atleta'}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-normal max-w-[105px] xl:max-w-[150px] truncate">
                      {user.email || ''}
                    </span>
                  </div>

                  <LuChevronDown
                    className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 shrink-0 ${
                      profileOpen ? 'rotate-180 text-lime-400' : ''
                    }`}
                  />
                </button>

                {/* Profile Dropdown Menu */}
                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#0c0e15]/95 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/80 overflow-hidden z-50 animate-[fadeIn_0.15s_ease-out]">
                    {/* User Info Header */}
                    <div className="p-3.5 border-b border-white/[0.06] bg-white/[0.02]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white truncate">
                          {user.name || 'Atleta'}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-lime-400/10 text-lime-400 border border-lime-400/20">
                          {user.role === 'admin' ? 'ADMIN' : 'ATLETA'}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 truncate">{user.email || ''}</p>
                    </div>

                    {/* Menu Items */}
                    <div className="p-1.5 space-y-1">
                      <Link
                        to="/profile"
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-colors active:scale-98"
                      >
                        <LuUser className="w-4 h-4 text-lime-400" />
                        <span>Mi Perfil Deportivo</span>
                      </Link>

                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          onStartTour?.();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-cyan-400 hover:bg-cyan-400/10 transition-colors active:scale-98 text-left"
                      >
                        <LuCompass className="w-4 h-4 text-cyan-400" />
                        <span>Repetir Tour Interactivo</span>
                      </button>

                      <div className="h-px bg-white/[0.06] my-1" />

                      <button
                        onClick={() => {
                          logout();
                          navigate('/login');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors active:scale-98 text-left"
                      >
                        <LuLogOut className="w-4 h-4" />
                        <span>Cerrar Sesión</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Hamburger Button (Mobile Drawer Trigger) */}
              <button
                className="lg:hidden w-10 h-10 rounded-xl flex items-center justify-center bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-zinc-200 transition-all duration-150 active:scale-95"
                onClick={() => setOpen(!open)}
                aria-label="Abrir menú"
              >
                {open ? <LuX className="w-5 h-5 text-white" /> : <LuMenu className="w-5 h-5 text-zinc-200" />}
              </button>
            </div>

          </div>
        </div>
      </nav>

      {/* ── MOBILE FULL DRAWER NAVIGATION (Slide-Over Panel) ── */}
      <div
        className={`fixed inset-0 z-50 lg:hidden transition-all duration-300 ${
          open ? 'visible' : 'invisible pointer-events-none'
        }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300 ${
            open ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setOpen(false)}
        />

        {/* Slide-out Drawer Panel */}
        <div
          className={`absolute top-0 right-0 h-full w-[85vw] max-w-[340px] bg-[#090A0F]/98 backdrop-blur-2xl border-l border-white/[0.08] shadow-2xl flex flex-col justify-between transition-transform duration-300 ease-out ${
            open ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div>
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-lime-400 flex items-center justify-center">
                  <LuDumbbell className="w-4 h-4 text-black stroke-[2.5]" />
                </div>
                <span className="text-sm font-black tracking-wider uppercase text-white">Navegación</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-9 h-9 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                aria-label="Cerrar menú"
              >
                <LuX className="w-5 h-5" />
              </button>
            </div>

            {/* Athlete Profile Card */}
            <div className="p-4 border-b border-white/[0.08] bg-white/[0.02]">
              <div className="flex items-center gap-3">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt=""
                    className="w-12 h-12 rounded-xl object-cover ring-2 ring-lime-400/50"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-lime-400 via-emerald-400 to-cyan-400 flex items-center justify-center text-black font-black text-sm shadow-md">
                    {initials}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">{user.name || 'Atleta'}</p>
                  <p className="text-xs text-zinc-400 truncate">{user.email || ''}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-lime-400/10 text-lime-400 border border-lime-400/20">
                    {user.role === 'admin' ? 'ADMINISTRADOR' : 'ATLETA PRO'}
                  </span>
                </div>
              </div>
            </div>

            {/* Nav Links List */}
            <div className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-280px)]">
              <p className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-zinc-500 font-extrabold">
                Módulos de Entrenamiento
              </p>
              {navLinks.map((l) => {
                const Icon = l.icon;
                const active = isActive(l.to);
                const isAI = l.to === '/recommendations';

                return (
                  <Link
                    key={l.to}
                    to={l.to}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] ${
                      active
                        ? 'bg-lime-400/15 text-lime-400 border border-lime-400/30 shadow-[0_0_15px_rgba(163,230,53,0.15)] font-bold'
                        : 'text-zinc-300 hover:text-white hover:bg-white/[0.05] border border-transparent'
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 ${
                        active
                          ? 'text-lime-400'
                          : isAI
                          ? 'text-cyan-400'
                          : 'text-zinc-400'
                      }`}
                    />
                    <span className="flex-1">{l.label}</span>
                    {active && (
                      <span className="w-2 h-2 rounded-full bg-lime-400 shadow-[0_0_8px_rgba(163,230,53,0.9)]" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Drawer Bottom Actions */}
          <div className="p-4 border-t border-white/[0.08] bg-[#0c0e15] space-y-2">
            <Link
              to="/profile"
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive('/profile')
                  ? 'bg-lime-400/10 text-lime-400 border border-lime-400/20'
                  : 'text-zinc-300 hover:bg-white/[0.05]'
              }`}
            >
              <LuUser className="w-4 h-4 text-lime-400" />
              <span>Mi Perfil Deportivo</span>
            </Link>

            <button
              onClick={() => {
                setOpen(false);
                onStartTour?.();
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-cyan-400 hover:bg-cyan-400/10 transition-colors text-left"
            >
              <LuCompass className="w-4 h-4 text-cyan-400" />
              <span>Repetir Tour</span>
            </button>

            <button
              onClick={() => {
                logout();
                navigate('/login');
                setOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-colors text-left"
            >
              <LuLogOut className="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── MOBILE BOTTOM ATHLETIC DOCK (Gym-Floor Single-Hand Navigation) ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#090A0F]/95 backdrop-blur-xl border-t border-white/[0.08] px-3 py-1.5 shadow-[0_-8px_30px_rgba(0,0,0,0.6)]">
        <div className="max-w-md mx-auto flex items-center justify-around">

          {/* 1. Inicio */}
          <Link
            to="/dashboard"
            className={`flex flex-col items-center justify-center min-w-[54px] min-h-[48px] rounded-xl transition-all duration-150 active:scale-90 ${
              isActive('/dashboard') ? 'text-lime-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <LuLayoutDashboard className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">Inicio</span>
            {isActive('/dashboard') && (
              <span className="w-1 h-1 rounded-full bg-lime-400 mt-0.5 shadow-[0_0_6px_rgba(163,230,53,1)]" />
            )}
          </Link>

          {/* 2. Rutinas */}
          <Link
            to="/routines"
            className={`flex flex-col items-center justify-center min-w-[54px] min-h-[48px] rounded-xl transition-all duration-150 active:scale-90 ${
              isActive('/routines') ? 'text-lime-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <LuListChecks className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">Rutinas</span>
            {isActive('/routines') && (
              <span className="w-1 h-1 rounded-full bg-lime-400 mt-0.5 shadow-[0_0_6px_rgba(163,230,53,1)]" />
            )}
          </Link>

          {/* 3. HERO CENTRAL ACTION: Entrenar (Elevated Floating Capsule) */}
          <Link
            to="/workouts"
            className="group relative -top-3 flex flex-col items-center justify-center select-none active:scale-90 transition-transform"
            aria-label="Registrar entrenamiento"
          >
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-200 ${
                isActive('/workouts')
                  ? 'bg-gradient-to-br from-lime-300 via-lime-400 to-emerald-400 text-black shadow-lime-400/40 ring-2 ring-lime-400'
                  : 'bg-gradient-to-br from-lime-400 to-emerald-400 text-black shadow-lime-400/25 hover:shadow-lime-400/40'
              }`}
            >
              <LuSword className="w-7 h-7 stroke-[2.5]" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider text-lime-400 mt-1">
              Entrenar
            </span>
          </Link>

          {/* 4. Progreso */}
          <Link
            to="/progress"
            className={`flex flex-col items-center justify-center min-w-[54px] min-h-[48px] rounded-xl transition-all duration-150 active:scale-90 ${
              isActive('/progress') ? 'text-lime-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <LuTrendingUp className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">Progreso</span>
            {isActive('/progress') && (
              <span className="w-1 h-1 rounded-full bg-lime-400 mt-0.5 shadow-[0_0_6px_rgba(163,230,53,1)]" />
            )}
          </Link>

          {/* 5. Menú / Más */}
          <button
            onClick={() => setOpen(true)}
            className="flex flex-col items-center justify-center min-w-[54px] min-h-[48px] rounded-xl text-zinc-400 hover:text-zinc-200 transition-all duration-150 active:scale-90"
            aria-label="Abrir menú completo"
          >
            <LuLayoutGrid className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">Más</span>
          </button>

        </div>
      </div>
    </>
  );
}
