import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LuArrowRight, LuArrowLeft, LuX, LuSparkles, LuRocket,
  LuPartyPopper, LuDumbbell, LuLayoutDashboard, LuListChecks,
  LuSword, LuSearch, LuTarget, LuTrendingUp, LuUser,
  LuChartColumnIncreasing, LuCircleUser,
} from 'react-icons/lu';
import api from '../api/axios';

const STEPS = [
  /* ── Welcome ── */
  {
    id: 'welcome',
    type: 'modal',
    title: '¡Bienvenido a APP-GYM! 🏋️',
    description: 'Tu compañero de entrenamiento inteligente. Te guiaremos por cada vista de la app para que saques el máximo provecho.',
    icon: LuRocket,
    gradient: 'from-primary to-accent',
  },

  /* ── Dashboard page ── */
  {
    id: 'dashboard-quick-actions',
    route: '/dashboard',
    selector: '[data-tour="dashboard-quick-actions"]',
    title: 'Accesos rápidos',
    description: 'Desde el Dashboard tienes atajos directos a Entrenamientos, Rutinas, Ejercicios y Recomendaciones IA.',
    icon: LuLayoutDashboard,
  },
  {
    id: 'dashboard-weekly-summary',
    route: '/dashboard',
    selector: '[data-tour="dashboard-weekly-summary"]',
    title: 'Resumen semanal',
    description: 'Aquí verás tus estadísticas de la semana: entrenamientos, volumen, peso máximo e insights automáticos.',
    icon: LuTrendingUp,
  },

  /* ── Routines page ── */
  {
    id: 'routines-actions',
    route: '/routines',
    selector: '[data-tour="routines-actions"]',
    title: 'Crea tus rutinas',
    description: 'Organiza tu semana creando rutinas manuales o importándolas desde un PDF. Define ejercicios, series y reps para cada día.',
    icon: LuListChecks,
  },

  /* ── Workouts page ── */
  {
    id: 'workouts-action',
    route: '/workouts',
    selector: '[data-tour="workouts-action"]',
    title: 'Registra entrenamientos',
    description: 'Registra cada sesión con pesos, series, reps y sensaciones. Incluye cronómetro y temporizador de descanso en vivo.',
    icon: LuSword,
  },

  /* ── Exercises page ── */
  {
    id: 'exercises-filters',
    route: '/exercises',
    selector: '[data-tour="exercises-filters"]',
    title: 'Busca y filtra ejercicios',
    description: 'Explora el catálogo completo. Filtra por grupo muscular, dificultad y equipamiento. Cada ejercicio tiene video demostrativo.',
    icon: LuSearch,
  },

  /* ── Goals page ── */
  {
    id: 'goals-actions',
    route: '/goals',
    selector: '[data-tour="goals-actions"]',
    title: 'Establece tus metas',
    description: 'Crea objetivos de fuerza, hipertrofia o resistencia. También puedes pedir sugerencias inteligentes con IA.',
    icon: LuTarget,
  },

  /* ── Progress page ── */
  {
    id: 'progress-kpis',
    route: '/progress',
    selector: '[data-tour="progress-kpis"]',
    title: 'Analiza tu progreso',
    description: 'Visualiza entrenamientos, volumen, calorías y peso máximo de la semana. Compara con la semana anterior y comparte tu tarjeta.',
    icon: LuChartColumnIncreasing,
  },

  /* ── Recommendations page ── */
  {
    id: 'recommendations-form',
    route: '/recommendations',
    selector: '[data-tour="recommendations-form"]',
    title: 'Recomendaciones con IA',
    description: 'Completa tu nivel, objetivo y equipo disponible para que Gemini genere una rutina personalizada para ti.',
    icon: LuSparkles,
  },

  /* ── Profile page ── */
  {
    id: 'profile-avatar',
    route: '/profile',
    selector: '[data-tour="profile-avatar"]',
    title: 'Tu perfil',
    description: 'Sube tu foto, configura tu nivel de experiencia, equipo disponible y frecuencia semanal.',
    icon: LuCircleUser,
  },

  /* ── Finish ── */
  {
    id: 'finish',
    type: 'modal',
    title: '¡Todo listo! 🎉',
    description: 'Ya conoces cada sección de la app. Comienza registrando tu primer entrenamiento o explorando los ejercicios. ¡A entrenar!',
    icon: LuPartyPopper,
    gradient: 'from-emerald-500 to-teal-500',
  },
];

export default function GuidedTour({ active, onFinish }) {
  const [step, setStep] = useState(0);
  const [highlight, setHighlight] = useState(null);
  const [tooltipStyle, setTooltipStyle] = useState({});
  const [navigating, setNavigating] = useState(false);
  const tooltipRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const current = STEPS[step];
  const isModal = current?.type === 'modal';
  const totalSteps = STEPS.length;

  // Navigate to the required route for the current step
  useEffect(() => {
    if (!active || isModal || !current?.route) return;
    if (location.pathname !== current.route) {
      setNavigating(true);
      setHighlight(null);
      navigate(current.route);
    }
  }, [active, step]);

  // After navigation, wait for DOM to settle then position
  useEffect(() => {
    if (!active || isModal) return;
    setNavigating(true);
    const t = setTimeout(() => {
      setNavigating(false);
      positionTooltip();
    }, 350);
    return () => clearTimeout(t);
  }, [active, step, location.pathname]);

  // Position spotlight & tooltip
  const positionTooltip = useCallback(() => {
    if (!current || isModal) {
      setHighlight(null);
      return;
    }

    const el = document.querySelector(current.selector);
    if (!el) {
      setHighlight(null);
      setTooltipStyle({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });
      return;
    }

    // Scroll element into view
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Wait a tick for scroll to finish
    setTimeout(() => {
      const rect = el.getBoundingClientRect();
      const pad = 8;

      setHighlight({
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      });

      requestAnimationFrame(() => {
        const tt = tooltipRef.current;
        if (!tt) return;
        const ttRect = tt.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        let top = rect.bottom + 14;
        let left = rect.left + rect.width / 2 - ttRect.width / 2;

        // If tooltip goes below viewport, show above
        if (top + ttRect.height > vh - 20) {
          top = rect.top - ttRect.height - 14;
        }

        // Clamp horizontal
        if (left < 12) left = 12;
        if (left + ttRect.width > vw - 12) left = vw - ttRect.width - 12;

        // Clamp vertical
        if (top < 12) top = rect.bottom + 14;

        setTooltipStyle({ top: `${top}px`, left: `${left}px` });
      });
    }, 150);
  }, [current, isModal]);

  useEffect(() => {
    if (!active) return;
    positionTooltip();
    window.addEventListener('resize', positionTooltip);
    window.addEventListener('scroll', positionTooltip, true);
    return () => {
      window.removeEventListener('resize', positionTooltip);
      window.removeEventListener('scroll', positionTooltip, true);
    };
  }, [active, step, positionTooltip]);

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      finishTour();
    }
  };

  const handlePrev = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSkip = () => finishTour();

  const finishTour = () => {
    setStep(0);
    setHighlight(null);
    api.patch('/users/tour-complete').catch(() => {});
    navigate('/dashboard');
    onFinish();
  };

  if (!active) return null;

  const Icon = current.icon;
  const progress = ((step + 1) / totalSteps) * 100;

  // ── Modal step (welcome / finish) ──
  if (isModal) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
        <div className="relative w-full max-w-md mx-4 animate-[scaleIn_0.3s_ease-out]">
          <div className="bg-slate-800 rounded-3xl border border-slate-700/50 shadow-2xl overflow-hidden">
            <div className={`h-2 bg-gradient-to-r ${current.gradient || 'from-primary to-accent'}`} />

            <div className="p-8 text-center space-y-5">
              <div className={`w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br ${current.gradient || 'from-primary to-accent'} flex items-center justify-center shadow-lg`}>
                <Icon className="w-10 h-10 text-white" />
              </div>

              <div>
                <h2 className="text-2xl font-extrabold text-white">{current.title}</h2>
                <p className="text-slate-400 mt-2 text-sm leading-relaxed">{current.description}</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-xs text-slate-500 font-medium">{step + 1}/{totalSteps}</span>
              </div>

              <div className="flex gap-3">
                {step === 0 ? (
                  <>
                    <button
                      onClick={handleSkip}
                      className="flex-1 px-4 py-3 rounded-xl border border-slate-600 text-slate-400 hover:bg-slate-700/50 text-sm font-medium transition-colors"
                    >
                      Omitir tour
                    </button>
                    <button
                      onClick={handleNext}
                      className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-primary to-indigo-600 text-white text-sm font-bold hover:shadow-lg hover:shadow-primary/25 transition-all flex items-center justify-center gap-2"
                    >
                      Comenzar <LuArrowRight className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={finishTour}
                    className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-bold hover:shadow-lg hover:shadow-emerald-500/25 transition-all flex items-center justify-center gap-2"
                  >
                    <LuRocket className="w-4 h-4" /> ¡A entrenar!
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Spotlight step ──
  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Dark overlay with hole */}
      <svg className="absolute inset-0 w-full h-full pointer-events-auto" onClick={handleNext}>
        <defs>
          <mask id="tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {highlight && (
              <rect
                x={highlight.left}
                y={highlight.top}
                width={highlight.width}
                height={highlight.height}
                rx="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0" y="0"
          width="100%" height="100%"
          fill="rgba(0,0,0,0.65)"
          mask="url(#tour-mask)"
        />
      </svg>

      {/* Glowing ring around highlighted element */}
      {highlight && (
        <div
          className="absolute rounded-xl ring-2 ring-primary/60 shadow-[0_0_25px_rgba(99,102,241,0.3)] pointer-events-none transition-all duration-300"
          style={{
            top: highlight.top,
            left: highlight.left,
            width: highlight.width,
            height: highlight.height,
          }}
        />
      )}

      {/* Page indicator pill */}
      {current.route && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="bg-slate-800/90 backdrop-blur-xl border border-slate-700/60 rounded-full px-4 py-1.5 shadow-lg flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-semibold text-slate-300">
              {current.route.replace('/', '').charAt(0).toUpperCase() + current.route.slice(2)}
            </span>
          </div>
        </div>
      )}

      {/* Tooltip card */}
      {!navigating && (
        <div
          ref={tooltipRef}
          className="absolute pointer-events-auto animate-[fadeInUp_0.25s_ease-out] max-w-sm w-80"
          style={tooltipStyle}
        >
          <div className="bg-slate-800/98 backdrop-blur-xl rounded-2xl border border-slate-700/60 shadow-2xl shadow-black/40 overflow-visible">
            <div className="h-1 bg-gradient-to-r from-primary to-accent rounded-t-2xl" />

            <div className="p-5 space-y-4">
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-white">{current.title}</h3>
                </div>
                <button
                  onClick={handleSkip}
                  className="w-7 h-7 rounded-lg hover:bg-white/5 flex items-center justify-center text-slate-500 hover:text-slate-300 transition-colors shrink-0"
                >
                  <LuX className="w-4 h-4" />
                </button>
              </div>

              {/* Description */}
              <p className="text-sm text-slate-400 leading-relaxed">{current.description}</p>

              {/* Progress bar */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-xs text-slate-500 font-medium whitespace-nowrap">{step + 1} / {totalSteps}</span>
              </div>

              {/* Nav buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrev}
                  disabled={step === 0}
                  className="w-9 h-9 rounded-lg bg-slate-700/50 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
                >
                  <LuArrowLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNext}
                  className="flex-1 h-9 rounded-lg bg-gradient-to-r from-primary to-indigo-600 hover:shadow-lg hover:shadow-primary/25 flex items-center justify-center gap-1.5 text-sm font-bold transition-all"
                >
                  {step === totalSteps - 2 ? 'Finalizar' : 'Siguiente'}
                  <LuArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
