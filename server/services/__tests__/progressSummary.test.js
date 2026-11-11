const { periodRanges } = require('../progressDates');
const { summarize, compare, summarySentence, baseInsights } = require('../progressSummary');

const log = (sets, mg = 'chest', name = 'Press de Banca') => ({ exercises: [{ exercise: { name, muscleGroup: mg }, sets }] });
const set = (reps, weight, completed) => ({ reps, weight, ...(completed === undefined ? {} : { completed }) });

describe('period ranges', () => {
  test('week: Monday → today against the same weekdays of last week', () => {
    const p = periodRanges('week', '2026-11-10', 'UTC'); // Tuesday
    expect(p.current).toEqual({ from: '2026-11-09', to: '2026-11-10' });
    expect(p.previous).toEqual({ from: '2026-11-02', to: '2026-11-03' });
    expect(p.display).toEqual({ from: '2026-11-09', to: '2026-11-15' });
    expect(p.daysElapsed).toBe(2);
    expect(p.buckets.map((b) => b.label)).toEqual(['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']);
    expect(p.buckets.filter((b) => b.future)).toHaveLength(5);
  });

  test('on Sunday the week is complete and compares with the whole previous week', () => {
    const p = periodRanges('week', '2026-11-15', 'UTC');
    expect(p.previous).toEqual({ from: '2026-11-02', to: '2026-11-08' });
    expect(p.buckets.some((b) => b.future)).toBe(false);
  });

  test('4 and 12 weeks: rolling days ending today against the same length before', () => {
    const p4 = periodRanges('4w', '2026-11-10', 'UTC');
    expect(p4.current).toEqual({ from: '2026-10-14', to: '2026-11-10' });
    expect(p4.previous).toEqual({ from: '2026-09-16', to: '2026-10-13' });
    expect(p4.buckets).toHaveLength(4);
    expect(p4.buckets[3]).toMatchObject({ from: '2026-11-04', to: '2026-11-10' });
    const p12 = periodRanges('12w', '2026-11-10', 'UTC');
    expect(p12.current.from).toBe('2026-08-19');
    expect(p12.buckets).toHaveLength(12);
  });

  test('unknown period → week', () => {
    expect(periodRanges('year', '2026-11-10', 'UTC').type).toBe('week');
  });
});

describe('summary and comparison', () => {
  test('sets not completed in a live session do not count', () => {
    const s = summarize([log([set(10, 50, true), set(10, 50, true), set(10, 50, false), set(8, 60)])]);
    expect(s).toMatchObject({ workouts: 1, totalSets: 3, totalReps: 28, totalVolume: 1480 });
  });

  test('no fake percentages when there is nothing to compare with', () => {
    const cur = summarize([log([set(10, 50)])]);
    const empty = summarize([]);
    expect(compare(cur, empty)).toMatchObject({ volumePct: null, hasPrevious: false, volumeChange: 0, workoutsChange: 1 });
    expect(compare(cur, cur)).toMatchObject({ volumePct: 0, hasPrevious: true });
  });

  test('sentences for the week', () => {
    const one = summarize([log([set(10, 50)])]);
    const two = summarize([log([set(10, 50)]), log([set(10, 60)])]);
    const none = summarize([]);
    expect(summarySentence('week', none, two, compare(none, two))).toBe('Aún no has entrenado esta semana; a estas alturas de la semana pasada llevabas 2 entrenamientos.');
    expect(summarySentence('week', none, none, compare(none, none))).toBe('Aún no has entrenado esta semana.');
    expect(summarySentence('week', two, one, compare(two, one))).toBe('Esta semana llevas 2 entrenamientos y vas por encima de la semana pasada a estas alturas: volumen +120%.');
    expect(summarySentence('week', one, two, compare(one, two))).toBe('Esta semana llevas 1 entrenamiento; el volumen va 55% por debajo de la semana pasada a estas alturas.');
    expect(summarySentence('week', one, one, compare(one, one))).toBe('Esta semana llevas 1 entrenamiento, un volumen similar al de la semana pasada a estas alturas.');
    expect(summarySentence('week', one, none, compare(one, none))).toBe('Esta semana llevas 1 entrenamiento. No hay entrenamientos en la semana pasada a estas alturas para comparar.');
  });

  test('sentences for 4 and 12 weeks include sessions per week', () => {
    const ten = summarize(Array.from({ length: 10 }, () => log([set(10, 50)])));
    const eight = summarize(Array.from({ length: 8 }, () => log([set(10, 50)])));
    expect(summarySentence('4w', ten, eight, compare(ten, eight))).toBe('En las últimas 4 semanas hiciste 10 entrenamientos (2,5 por semana) y vas por encima de las 4 semanas anteriores: volumen +25%.');
    const twelve = summarize(Array.from({ length: 36 }, () => log([set(10, 50)])));
    expect(summarySentence('12w', twelve, twelve, compare(twelve, twelve))).toMatch(/^En las últimas 12 semanas hiciste 36 entrenamientos \(3 por semana\), un volumen similar/);
  });

  test('untrained muscles are pointed out only when the range is long enough', () => {
    const cur = summarize([log([set(10, 50)], 'chest')]);
    expect(baseInsights('week', 2, cur)).toEqual([]); // Tuesday: too early
    expect(baseInsights('week', 5, cur)[0]).toMatch(/sin entrenar esta semana: espalda/);
    expect(baseInsights('4w', 28, cur)[0]).toMatch(/en este periodo/);
    expect(baseInsights('4w', 28, summarize([]))).toEqual([]);
  });
});
