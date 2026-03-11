import { Link } from 'react-router-dom';
import { LuClipboardList, LuChartBar, LuBot, LuTimer, LuTarget, LuVideo, LuDumbbell, LuRocket, LuChevronDown } from 'react-icons/lu';

const FEATURES = [
  { Icon: LuClipboardList, title: 'Rutinas Personalizadas', desc: 'Crea y organiza rutinas adaptadas a tus objetivos y nivel de experiencia.' },
  { Icon: LuChartBar, title: 'Seguimiento de Progreso', desc: 'Visualiza tu evolución con gráficos y estadísticas semanales detalladas.' },
  { Icon: LuBot, title: 'IA como Entrenador', desc: 'Recibe recomendaciones inteligentes basadas en tu historial y objetivos.' },
  { Icon: LuTimer, title: 'Cronómetro & Descansos', desc: 'Temporizadores integrados para controlar tus entrenamientos al detalle.' },
  { Icon: LuTarget, title: 'Objetivos Fitness', desc: 'Define metas claras y mide tu progreso en fuerza, resistencia o pérdida de peso.' },
  { Icon: LuVideo, title: 'Videos de Ejercicios', desc: 'Catálogo con videos en español para aprender la técnica correcta.' },
];

export default function Landing() {
  return (
    <div className="min-h-screen">
      {/* â”€â”€â”€ Hero Section â”€â”€â”€ */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center text-center px-4 overflow-hidden hero-pattern">
        {/* Decorative blobs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/8 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />

        <div className="relative z-10 max-w-3xl animate-fadeInUp">
          <div className="mb-6 animate-float"><LuDumbbell className="w-20 h-20 md:w-24 md:h-24 mx-auto text-primary" /></div>
          <h1 className="text-5xl md:text-7xl font-extrabold mb-4 tracking-tight">
            <span className="text-gradient">StephFit</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto mb-4 leading-relaxed">
            Tu compañero inteligente de entrenamiento.
          </p>
          <p className="text-base md:text-lg text-gray-400 max-w-xl mx-auto mb-10">
            Registra tus entrenamientos, sigue rutinas con IA y alcanza tus objetivos fitness â€“ todo en un solo lugar.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="bg-primary hover:bg-indigo-600 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all hover:scale-105 hover:shadow-lg hover:shadow-primary/30 active:scale-95"
            >
              Comenzar Gratis <LuRocket className="inline w-5 h-5 ml-1" />
            </Link>
            <Link
              to="/login"
              className="border-2 border-primary/60 text-primary hover:bg-primary/10 px-8 py-4 rounded-xl font-bold text-lg transition-all hover:scale-105 hover:border-primary"
            >
              Iniciar Sesión
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 animate-bounce text-gray-500"><LuChevronDown className="w-6 h-6" /></div>
      </section>

      {/* â”€â”€â”€ Features Section â”€â”€â”€ */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-4">
          Todo lo que necesitas para <span className="text-gradient">entrenar mejor</span>
        </h2>
        <p className="text-gray-400 text-center max-w-xl mx-auto mb-12">
          Herramientas diseñadas para ayudarte a ser constante, mejorar tu técnica y alcanzar tus metas fitness.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 card-glow group"
            >
              <div className="mb-3 group-hover:scale-110 transition-transform"><f.Icon className="w-10 h-10 text-primary" /></div>
              <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">{f.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* â”€â”€â”€ Stats / Social proof â”€â”€â”€ */}
      <section className="border-t border-slate-800 bg-slate-900/50 py-16">
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: '40+', label: 'Ejercicios' },
            { value: <LuVideo className="w-8 h-8 mx-auto text-primary" />, label: 'Videos en Español' },
            { value: <LuBot className="w-8 h-8 mx-auto text-primary" />, label: 'IA Integrada' },
            { value: '100%', label: 'Gratis' },
          ].map((s, i) => (
            <div key={i}>
              <div className="text-3xl md:text-4xl font-extrabold text-gradient">{s.value}</div>
              <p className="text-sm text-gray-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* â”€â”€â”€ CTA Section â”€â”€â”€ */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center bg-gradient-to-br from-indigo-900/40 to-slate-800/60 border border-primary/20 rounded-3xl p-10">
          <h2 className="text-3xl font-extrabold mb-4">
            ¿Listo para empezar? <LuDumbbell className="inline w-7 h-7 ml-1" />
          </h2>
          <p className="text-gray-300 mb-8">
            Únete y transforma tu entrenamiento con tecnología inteligente.
          </p>
          <Link
            to="/register"
            className="inline-block bg-primary hover:bg-indigo-600 text-white px-10 py-4 rounded-xl font-bold text-lg transition-all hover:scale-105 hover:shadow-lg hover:shadow-primary/30 active:scale-95"
          >
            Crear mi Cuenta
          </Link>
        </div>
      </section>

      {/* â”€â”€â”€ Footer â”€â”€â”€ */}
      <footer className="border-t border-slate-800 py-8 text-center text-sm text-gray-500">
        <p className="flex items-center justify-center gap-2"><LuDumbbell className="w-4 h-4" /> StephFit â€” Entrena inteligente, progresa constante.</p>
      </footer>
    </div>
  );
}

