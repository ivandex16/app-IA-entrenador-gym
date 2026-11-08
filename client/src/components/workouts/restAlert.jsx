import toast from 'react-hot-toast';
import { LuZap, LuDumbbell, LuFlame, LuX } from 'react-icons/lu';

/*
 * Everything that signals "rest is over": sound, vibration and a motivational
 * notification. The full-screen glow lives in <RestDoneFlash>.
 */

/* ── Sound ──
   Mobile browsers only let a page play audio from an AudioContext that was
   created or resumed during a user gesture. primeRestAudio() is called from
   the tap that starts the rest (checking a set, or the manual rest buttons),
   so the beep at the end is allowed to play later. */
let audioCtx = null;

export function primeRestAudio() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch {
    // Audio unavailable: the visual alert still works.
  }
}

function playBeeps() {
  try {
    primeRestAudio();
    if (!audioCtx) return;
    const beep = (freq, delay) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.value = freq;
      gain.gain.value = 0.3;
      osc.start(audioCtx.currentTime + delay);
      osc.stop(audioCtx.currentTime + delay + 0.15);
    };
    beep(880, 0);
    beep(880, 0.2);
    beep(1320, 0.4);
  } catch {
    // Fallback: no sound
  }
}

/* ── Vibration (Android; iOS Safari doesn't support it and ignores the call) ── */
function vibrate() {
  try {
    navigator.vibrate?.([220, 90, 220]);
  } catch {
    // Not supported
  }
}

/* ── Motivational messages ── */
const MESSAGES = {
  set: [
    '¡Siguiente serie! Mismo peso, más intención.',
    'Respira hondo y rompe esta serie.',
    'Tu músculo ya se recuperó. ¡A por ella!',
    'Una serie más cerca de tu mejor versión.',
    'Concentración total: técnica primero, fuerza después.',
    'El descanso terminó, la disciplina no.',
  ],
  exercise: [
    '¡Nuevo ejercicio, nueva batalla!',
    'Cambia el chip: ¡vamos con todo al siguiente!',
    'Músculo fresco, ganas intactas. ¡Dale!',
    'Lo que hiciste ya cuenta. Ahora suma más.',
    'Siguiente ejercicio: ¡demuestra de qué estás hecho!',
  ],
};

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function RestDoneToast({ t, type, message }) {
  const isExercise = type === 'exercise';
  const Icon = isExercise ? LuFlame : LuDumbbell;
  return (
    <div
      className={`pointer-events-auto w-[min(92vw,380px)] flex items-center gap-3 rounded-2xl border bg-zinc-900/95 backdrop-blur-md px-4 py-3 shadow-2xl shadow-black/60 transition-all duration-300 ${
        isExercise ? 'border-cyan-400/40' : 'border-lime-400/40'
      } ${t.visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}
      role="status"
    >
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
          isExercise ? 'bg-cyan-400 text-zinc-950' : 'bg-lime-400 text-zinc-950'
        }`}
      >
        <Icon className="w-6 h-6" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-white flex items-center gap-1.5">
          <LuZap className={`w-4 h-4 ${isExercise ? 'text-cyan-400' : 'text-lime-400'}`} />
          ¡Descanso terminado!
        </p>
        <p className="text-xs text-zinc-300 mt-0.5">{message}</p>
      </div>
      <button
        type="button"
        onClick={() => toast.dismiss(t.id)}
        className="w-7 h-7 rounded-full text-zinc-500 hover:text-white hover:bg-white/10 flex items-center justify-center shrink-0"
        aria-label="Cerrar aviso"
      >
        <LuX className="w-4 h-4" />
      </button>
    </div>
  );
}

/* Sound + vibration + motivational notification at the top of the screen. */
export function announceRestDone(type) {
  playBeeps();
  vibrate();
  const message = pick(MESSAGES[type] || MESSAGES.set);
  toast.custom((t) => <RestDoneToast t={t} type={type} message={message} />, {
    id: 'rest-done', // a new rest replaces the previous notice instead of stacking
    position: 'top-center',
    duration: 5000,
  });
}
