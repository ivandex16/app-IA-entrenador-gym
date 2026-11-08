import { memo, useMemo } from 'react';

/* Header totals for the history view: sessions, exercises and calories. */
function HistoryStats({ logs }) {
  const { exerciseCount, calories } = useMemo(
    () =>
      logs.reduce(
        (acc, l) => ({
          exerciseCount: acc.exerciseCount + (l.exercises?.length || 0),
          calories: acc.calories + (l.caloriesBurned || 0),
        }),
        { exerciseCount: 0, calories: 0 }
      ),
    [logs]
  );

  return (
    <div className="flex items-center gap-5 mt-5">
      <div>
        <p className="text-2xl font-black text-white font-mono">{logs.length}</p>
        <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Sesiones</p>
      </div>
      <div className="w-px h-8 bg-zinc-800" />
      <div>
        <p className="text-2xl font-black text-lime-400 font-mono">{exerciseCount}</p>
        <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Ejercicios</p>
      </div>
      <div className="w-px h-8 bg-zinc-800" />
      <div>
        <p className="text-2xl font-black text-orange-400 font-mono">{calories.toLocaleString()}</p>
        <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">kcal quemadas</p>
      </div>
    </div>
  );
}

export default memo(HistoryStats);
