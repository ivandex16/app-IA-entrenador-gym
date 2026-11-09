import { memo } from 'react';

/* Header totals of finished sessions (from the server summary, whole history). */
function HistoryStats({ totals }) {
  if (!totals) return null;
  return (
    <div className="flex items-center gap-5 mt-5">
      <div>
        <p className="text-2xl font-black text-white font-mono">{totals.sessions}</p>
        <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Sesiones</p>
      </div>
      <div className="w-px h-8 bg-zinc-800" />
      <div>
        <p className="text-2xl font-black text-lime-400 font-mono">{totals.exercises}</p>
        <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Ejercicios</p>
      </div>
      <div className="w-px h-8 bg-zinc-800" />
      <div>
        <p className="text-2xl font-black text-orange-400 font-mono">{Math.round(totals.calories).toLocaleString()}</p>
        <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">kcal quemadas</p>
      </div>
    </div>
  );
}

export default memo(HistoryStats);
