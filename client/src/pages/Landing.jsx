import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  LuClipboardList, LuChartBar, LuBot, LuTimer, LuTarget,
  LuVideo, LuDumbbell, LuRocket, LuChevronDown,
} from 'react-icons/lu';

// Registrar plugin GSAP
gsap.registerPlugin(ScrollTrigger);

const FEATURES = [
  { Icon: LuClipboardList, title: 'Rutinas Personalizadas', desc: 'Crea y organiza rutinas adaptadas a tus objetivos y nivel de experiencia.' },
  { Icon: LuChartBar, title: 'Seguimiento de Progreso', desc: 'Visualiza tu evolución con gráficos y estadísticas semanales detalladas.' },
  { Icon: LuBot, title: 'IA como Entrenador', desc: 'Recibe recomendaciones inteligentes basadas en tu historial y objetivos.' },
  { Icon: LuTimer, title: 'Cronómetro & Descansos', desc: 'Temporizadores integrados para controlar tus entrenamientos al detalle.' },
  { Icon: LuTarget, title: 'Objetivos Fitness', desc: 'Define metas claras y mide tu progreso en fuerza, resistencia o pérdida de peso.' },
  { Icon: LuVideo, title: 'Videos de Ejercicios', desc: 'Catálogo con videos en español para aprender la técnica correcta.' },
];

export default function Landing() {
  const containerRef = useRef(null);
  const videoRef = useRef(null);

  // ─── MOTOR DE VIDEO SCRUBBING DE ALTO RENDIMIENTO (60/120 FPS FLUIDO) ───
  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    // Asegurar mute en JS para liberar hilos de audio del decodificador
    video.muted = true;

    let st = null;
    let targetTime = 0;
    let isSeeking = false;
    let lastSeekTimestamp = 0;

    // Cuando el decodificador de GPU termina de pintar el fotograma solicitado
    const onSeeked = () => {
      isSeeking = false;
    };
    video.addEventListener('seeked', onSeeked);

    // Bucle de sincronización e interpolación suave (Lerp) ejecutado por el ticker de GSAP a 60/120 fps
    const updatePlayhead = () => {
      // Liberación de seguridad si el evento seeked tardase más de 90ms
      if (isSeeking && Date.now() - lastSeekTimestamp > 90) {
        isSeeking = false;
      }

      if (!isSeeking && video.readyState >= 2 && video.duration) {
        const diff = targetTime - video.currentTime;

        // Solo actualizar si hay una diferencia perceptible
        if (Math.abs(diff) > 0.015) {
          isSeeking = true;
          lastSeekTimestamp = Date.now();

          // Si la distancia es muy corta, fijar exacto; si no, aplicar paso suave (lerp)
          if (Math.abs(diff) < 0.06) {
            video.currentTime = targetTime;
          } else {
            // Factor 0.35 para respuesta inmediata con amortiguación natural
            video.currentTime += diff * 0.35;
          }
        }
      }
    };

    gsap.ticker.add(updatePlayhead);

    const initScrollTrigger = () => {
      if (st) st.kill();
      if (!video.duration || isNaN(video.duration)) return;

      // "Despertar" la aceleración por hardware de la GPU reproduciendo y pausando inmediatamente
      video.play().then(() => video.pause()).catch(() => {});

      st = ScrollTrigger.create({
        trigger: container,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.5, // Amortiguación suave del scroll
        onUpdate: (self) => {
          if (video.duration && !isNaN(video.duration)) {
            // Actualiza el target de tiempo según el scroll del usuario
            targetTime = self.progress * video.duration;
          }
        },
      });
    };

    // Inicializar cuando los metadatos o datos del video estén listos
    if (video.readyState >= 1 && video.duration) {
      initScrollTrigger();
    } else {
      video.addEventListener('loadedmetadata', initScrollTrigger, { once: true });
      video.addEventListener('loadeddata', initScrollTrigger, { once: true });
    }

    // Limpieza estricta de listeners y GSAP ticker
    return () => {
      video.removeEventListener('loadedmetadata', initScrollTrigger);
      video.removeEventListener('loadeddata', initScrollTrigger);
      video.removeEventListener('seeked', onSeeked);
      gsap.ticker.remove(updatePlayhead);
      if (st) st.kill();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="min-h-[300vh] text-zinc-100 selection:bg-lime-400 selection:text-black relative bg-[#090A0F]"
    >
      {/* ─── FONDO DE VIDEO FIJO (Renderizado en capa z-0 detrás del contenido) ─── */}
      <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <video
          ref={videoRef}
          src="/img_landing/fondo_landing_video.mp4"
          playsInline
          muted
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover -z-10 opacity-45 transform-gpu scale-105 will-change-transform"
        >
          <source src="/img_landing/fondo_landing_video.mp4" type="video/mp4" />
        </video>

        {/* Filtros de contraste para máxima legibilidad */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#090A0F] via-[#090A0F]/55 to-[#090A0F]/20 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_40%,_#090A0F_95%)] pointer-events-none" />

        {/* Ambient Sport Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-lime-400/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-[400px] h-[300px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      </div>

      {/* ─── CONTENIDO FRONTAL (relative z-10 pointer-events-auto) ─── */}
      <div className="relative z-10 pointer-events-auto">
        {/* ─── Hero Section ─── */}
        <section className="relative min-h-[92vh] flex flex-col items-center justify-center text-center px-4 overflow-hidden pt-8 pb-16">
          <div className="relative z-10 max-w-3xl animate-fadeInUp">
            {/* Animación del SVG de la mancuerna preservada */}
            <div className="mb-5 inline-flex p-4 rounded-3xl bg-lime-400/10 border border-lime-400/20 text-lime-400 backdrop-blur-md shadow-[0_0_30px_rgba(204,255,0,0.15)] ring-1 ring-white/10 animate-float">
              <LuDumbbell className="w-14 h-14 md:w-16 md:h-16 text-lime-400" />
            </div>

            {/* Badge estilo píldora */}
            <div className="mb-4">
              <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-lime-400/10 border border-lime-400/30 text-lime-400 text-xs font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" />
                Tu compañero inteligente
              </span>
            </div>

            {/* Título Masivo */}
            <h1 className="text-6xl sm:text-8xl font-black mb-4 tracking-tighter text-white">
              <span className="bg-gradient-to-r from-white via-zinc-100 to-lime-400 bg-clip-text text-transparent">
                APP-GYM
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-zinc-200 max-w-2xl mx-auto mb-3 font-bold leading-relaxed">
              Tu compañero inteligente de entrenamiento de fuerza.
            </p>
            <p className="text-base md:text-lg text-zinc-400 max-w-xl mx-auto mb-10 leading-normal">
              Registra tus entrenamientos, optimiza series y repeticiones con IA y alcanza tus objetivos fitness en un solo lugar.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {/* Botón Primario: Verde lima con resplandor */}
              <Link
                to="/register"
                className="bg-lime-400 hover:bg-lime-300 text-black font-black px-8 py-4 rounded-2xl text-lg transition-all hover:scale-[1.02] shadow-[0_0_30px_rgba(204,255,0,0.25)] active:scale-[0.98] flex items-center justify-center gap-2"
              >
                Comenzar Gratis <LuRocket className="w-5 h-5" />
              </Link>

              {/* Botón Secundario: Vidrio translúcido */}
              <Link
                to="/login"
                className="bg-zinc-900/60 hover:bg-zinc-900/80 text-white border border-white/10 backdrop-blur-md px-8 py-4 rounded-2xl font-bold text-lg transition-all hover:scale-[1.02] hover:border-lime-400/40 active:scale-[0.98]"
              >
                Iniciar Sesión
              </Link>
            </div>
          </div>

          {/* Indicador de scroll */}
          <div className="absolute bottom-6 animate-bounce text-zinc-500">
            <LuChevronDown className="w-6 h-6" />
          </div>
        </section>

        {/* ─── Features Section ─── */}
        <section className="max-w-6xl mx-auto px-4 py-24 relative z-10">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-lime-400/10 border border-lime-400/30 text-lime-400 text-xs font-bold uppercase tracking-wider mb-3">
              Potencia Tu Rendimiento
            </span>
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
              Todo lo que necesitas para <span className="bg-gradient-to-r from-white to-lime-400 bg-clip-text text-transparent">entrenar mejor</span>
            </h2>
            <p className="text-zinc-400 text-base md:text-lg max-w-xl mx-auto mt-3">
              Herramientas analíticas y biomecánicas para mejorar tu sobrecarga progresiva y consistencia.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="bg-zinc-900/60 border border-white/5 rounded-3xl p-7 hover:border-lime-400/30 hover:shadow-2xl hover:shadow-lime-400/5 transition-all duration-300 group backdrop-blur-sm"
              >
                <div className="w-12 h-12 rounded-2xl bg-zinc-800/80 border border-white/5 flex items-center justify-center text-lime-400 mb-5 group-hover:scale-110 group-hover:bg-lime-400/10 group-hover:border-lime-400/30 transition-all">
                  <f.Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-lime-400 transition-colors">{f.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Stats / Social proof ─── */}
        <section className="border-t border-b border-white/5 bg-zinc-950/70 py-16 relative z-10 backdrop-blur-md">
          <div className="max-w-4xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '60+', label: 'Ejercicios con Técnica' },
              { value: <LuVideo className="w-8 h-8 mx-auto text-lime-400" />, label: 'Videos y Guías en Español' },
              { value: <LuBot className="w-8 h-8 mx-auto text-lime-400" />, label: 'IA Coach Gemini' },
              { value: '100%', label: 'Gratis y Sin Publicidad' },
            ].map((s, i) => (
              <div key={i}>
                <div className="text-3xl md:text-4xl font-black text-white font-mono">{s.value}</div>
                <p className="text-xs md:text-sm font-semibold text-zinc-400 mt-2 uppercase tracking-wide">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── CTA Section ─── */}
        <section className="py-24 px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center bg-zinc-900/80 border border-white/10 rounded-3xl p-10 md:p-14 relative overflow-hidden backdrop-blur-md shadow-2xl">
            <div className="absolute top-0 right-1/4 w-72 h-72 bg-lime-400/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-4">
                ¿Listo para transformar tu entrenamiento? <LuDumbbell className="inline w-8 h-8 ml-1 text-lime-400" />
              </h2>
              <p className="text-zinc-300 text-base md:text-lg mb-8 max-w-xl mx-auto leading-relaxed">
                Únete a los atletas que registran cada levantamiento y dejan que la IA optimice sus cargas y descansos.
              </p>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 bg-lime-400 hover:bg-lime-300 text-zinc-950 px-10 py-4 rounded-2xl font-black text-lg transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-lime-400/25 active:scale-[0.98]"
              >
                Crear mi Cuenta Gratis <LuRocket className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>

        {/* ─── Footer ─── */}
        <footer className="border-t border-white/5 py-8 text-center text-xs text-zinc-500 relative z-10 font-mono">
          <p className="flex items-center justify-center gap-2">
            <LuDumbbell className="w-4 h-4 text-lime-400" /> APP-GYM — Entrena con ciencia, progresa constante.
          </p>
        </footer>
      </div>
    </div>
  );
}