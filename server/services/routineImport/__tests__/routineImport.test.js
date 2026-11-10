const { parseRoutineText } = require('../parseRoutineText');
const { normalizeLine } = require('../textUtils');
const { buildCatalog, matchExercise } = require('../matchExercises');

const parse = (text) => parseRoutineText(text);
const all = (text) => parse(text).days.flatMap((d) => d.exercises);
const one = (text) => all(text)[0];
const v = (f) => (f ? f.value : null);

describe('normalization', () => {
  test.each([['4x10'], ['4 x 10'], ['4×10'], ['4 X 10'], ['4 * 10'], ['4 ✕ 10']])('%s → 4x10', (s) => {
    expect(normalizeLine(s).text).toBe('4x10');
  });
  test('OCR lookalikes in numbers are repaired and flagged', () => {
    expect(normalizeLine('Press 4xl0')).toEqual({ text: 'Press 4x10', fixed: true });
    expect(normalizeLine('Press 4 x 1O')).toEqual({ text: 'Press 4x10', fixed: true });
    expect(normalizeLine('Press — 4 x 10').text).toBe('Press - 4x10');
  });
});

describe('common formats', () => {
  test('Bench Press 4x10 (English)', () => {
    const ex = one('Bench Press 4x10');
    expect(ex.detectedName).toBe('Bench Press');
    expect(v(ex.sets)).toBe(4);
    expect(v(ex.reps)).toEqual({ min: 10, max: 10 });
    expect(ex.weight).toBeNull();
    expect(ex.restSeconds).toBeNull();
  });
  test('Bench Press - 4 x 10', () => {
    const ex = one('Bench Press - 4 x 10');
    expect(ex.detectedName).toBe('Bench Press');
    expect(v(ex.sets)).toBe(4);
  });
  test('name line followed by "4 series" and "10 reps" (Spanish)', () => {
    const ex = one('Press banca\n4 series\n10 reps');
    expect(ex.detectedName).toBe('Press banca');
    expect(v(ex.sets)).toBe(4);
    expect(v(ex.reps)).toEqual({ min: 10, max: 10 });
  });
  test('weight: Squat 3x8 100kg', () => {
    const ex = one('Squat 3x8 100kg');
    expect([ex.detectedName, v(ex.sets), v(ex.reps).min, v(ex.weight)]).toEqual(['Squat', 3, 8, 100]);
  });
  test('rest on its own line: Hip Thrust / 4 x 12 / 90 sec rest', () => {
    const ex = one('Hip Thrust\n4 x 12\n90 sec rest');
    expect([v(ex.sets), v(ex.reps).min, v(ex.restSeconds)]).toEqual([4, 12, 90]);
    expect(ex.restSeconds.confidence).toBe('high');
  });
  test('range and RIR: Curl Bíceps 3x10-12 RIR 2', () => {
    const ex = one('Curl Bíceps\n3x10-12\nRIR 2');
    expect(v(ex.reps)).toEqual({ min: 10, max: 12 });
    expect(v(ex.rir)).toBe('2');
  });
  test('"4 series de 8-10", "10 reps x 3 sets", RPE, tempo, @90s, minutes', () => {
    expect(v(one('Remo con barra: 4 series de 8-10').reps)).toEqual({ min: 8, max: 10 });
    const b = one('Lunges 10 reps x 3 sets RPE 8 tempo 3-1-1-0');
    expect([v(b.sets), v(b.reps).min, v(b.rpe), v(b.tempo)]).toEqual([3, 10, '8', '3-1-1-0']);
    expect(v(one('Press de Banca: 4x10 @90s').restSeconds)).toBe(90);
    expect(v(one('Peso muerto 5x5 descanso 3 min').restSeconds)).toBe(180);
    expect(v(one('Dominadas 3x8 descanso 1:30').restSeconds)).toBe(90);
  });
  test('pounds are converted and marked for review', () => {
    const ex = one('Curl 3x12 45 lb');
    expect(v(ex.weight)).toBe(20.5);
    expect(ex.weight.confidence).toBe('medium');
  });
  test('notes, failure and parentheses', () => {
    const ex = one('Fondos 3x10 (lastre opcional)\nNota: bajar lento');
    expect(ex.notes).toEqual(expect.arrayContaining(['lastre opcional', 'bajar lento']));
    expect(one('Flexiones 3 series al fallo').notes).toContain('Al fallo');
  });
});

describe('structure', () => {
  test('days, routine name and numbered lists', () => {
    const r = parse('RUTINA TORSO / PIERNA\nLunes - Pecho y Tríceps\n1. Press banca 4x10\n2. Aperturas 3x12\nMartes - Pierna\nSentadilla 4x8');
    expect(r.name.value).toBe('RUTINA TORSO / PIERNA');
    expect(r.days.map((d) => [d.label, d.exercises.length])).toEqual([['Lunes - Pecho y Tríceps', 2], ['Martes - Pierna', 1]]);
  });
  test('Nombre: line and group-only headers (PUSH, Pecho y tríceps)', () => {
    const r = parse('Nombre: Mi rutina\nPUSH\nPress militar 4x10\nPecho y tríceps:\nFondos 3x12');
    expect(r.name.value).toBe('Mi rutina');
    expect(r.days.map((d) => d.label)).toEqual(['PUSH', 'Pecho y tríceps']);
  });
  test('table with pipes', () => {
    const r = all('Ejercicio | Series | Reps | Peso\nPress | 4 | 10 | 80kg\nRemo | 3 | 8-12 | -');
    expect(r.map((e) => [e.detectedName, v(e.sets), v(e.reps), v(e.weight)])).toEqual([
      ['Press', 4, { min: 10, max: 10 }, 80],
      ['Remo', 3, { min: 8, max: 12 }, null],
    ]);
  });
  test('table without separators (OCR of a printed table)', () => {
    const r = all('Ejercicio Series Reps Peso Descanso\nPress banca 4 10 80kg 90s\nSentadilla 3 8 100 2min');
    expect(r.map((e) => [e.detectedName, v(e.sets), v(e.reps).min, v(e.weight), v(e.restSeconds)])).toEqual([
      ['Press banca', 4, 10, 80, 90],
      ['Sentadilla', 3, 8, 100, 120],
    ]);
  });
  test('table from real OCR output (wide gaps, two columns merged into one cell)', () => {
    const r = parseRoutineText([
      { text: 'Ejercicio                     Series        Reps Peso          Descanso', confidence: 93 },
      { text: 'Hip thrust                    3                12           -                 60s', confidence: 95 },
      { text: 'Curl biceps                 3        10-12 -        -', confidence: 88 },
    ]).days[0].exercises;
    expect(r.map((e) => [e.detectedName, v(e.sets), v(e.reps), v(e.weight), v(e.restSeconds)])).toEqual([
      ['Hip thrust', 3, { min: 12, max: 12 }, null, 60],
      ['Curl biceps', 3, { min: 10, max: 12 }, null, null],
    ]);
  });
  test('table notes column keeps several words', () => {
    const [ex] = all('Ejercicio | Series | Reps | Notas\nRemo | 3 | 10 | agarre prono lento');
    expect(ex.notes).toEqual(['agarre prono lento']);
  });
  test('supersets A1/A2', () => {
    const r = all('A1. Curl martillo 3x12\nA2. Press francés 3x12');
    expect(r.map((e) => e.superset)).toEqual(['A', 'A']);
  });
});

describe('missing data and OCR problems', () => {
  test('missing fields stay empty — nothing is invented', () => {
    const ex = one('Aperturas');
    expect(ex.detectedName).toBe('Aperturas');
    for (const k of ['sets', 'reps', 'weight', 'restSeconds', 'rir', 'rpe', 'tempo']) expect(ex[k]).toBeNull();
  });
  test('repaired digits and low OCR confidence lower the confidence', () => {
    expect(one('Press 4xl0').sets.confidence).toBe('low');
    const [ex] = parseRoutineText([{ text: 'Remo 4x10', confidence: 40 }]).days[0].exercises;
    expect(ex.sets.confidence).toBe('low');
    expect(ex.nameConfidence).toBe('low');
  });
  test('photo edge noise: doubtful text-only lines are not exercises, the title is still found', () => {
    const r = parseRoutineText([
      { text: 'E aes ese area Cas me', confidence: 31 },
      { text: 'RUTINA PECHO', confidence: 90 },
      { text: 'Press banca 4x10', confidence: 92 },
      { text: 'Bi NA', confidence: 20 },
    ]);
    expect(r.name.value).toBe('RUTINA PECHO');
    expect(r.days[0].exercises.map((e) => e.detectedName)).toEqual(['Press banca']);
    expect(r.unparsed).toEqual(['E aes ese area Cas me', 'Bi NA']);
  });
  test('implausible values are flagged, not changed', () => {
    const ex = one('Press 40x10');
    expect(v(ex.sets)).toBe(40);
    expect(ex.sets.confidence).toBe('low');
  });
  test('noise lines are ignored or reported as unparsed', () => {
    const r = parse('~~ || ;;\nPress banca 4x10\n%%% 33');
    expect(r.days[0].exercises).toHaveLength(1);
  });
  test('empty text → no exercises', () => {
    expect(parse('').days).toEqual([]);
    expect(parse('   \n  ').days).toEqual([]);
  });
});

describe('real weekly sheet (5 day columns, OCR output after the client layout step)', () => {
  const lines = require('./fixtures/weekly-sheet.lines.json');
  const r = parseRoutineText(lines);
  const ex = (d, i) => r.days[d].exercises[i];
  test('one day per column with its focus as subtitle', () => {
    expect(r.days.map((d) => d.label)).toEqual([
      'Día 1 · Piernas A + abdomen · Cuádriceps y glúteos',
      'Día 2 · Tren superior A · Equilibrio y sobrecarga',
      'Día 3 · Piernas B + abdomen · Femorales y glúteos',
      'Día 4 · Tren superior B · Volumen y control',
      'Día 5 · Piernas C + abdomen · Volumen y unilateral',
    ]);
    expect(r.name.value).toMatch(/^NIVEL AVANZADO/);
  });
  test('exercises: names over two lines, sets × reps, rest ranges, per side, cues', () => {
    expect(r.days.map((d) => d.exercises.length)).toEqual([5, 5, 5, 5, 5]);
    expect([ex(0, 0).detectedName, v(ex(0, 0).sets), v(ex(0, 0).reps), v(ex(0, 0).restSeconds)]).toEqual(['Sentadilla en Smith', 3, { min: 6, max: 8 }, 150]);
    expect(ex(0, 0).notes).toEqual(expect.arrayContaining(['Descanso 150-180 s']));
    expect(ex(1, 0).detectedName).toBe('Jalón al pecho agarre neutro');
    expect(ex(1, 4).detectedName).toBe('Curl de bíceps con mancuernas');
    expect(ex(2, 3).notes).toContain('Por lado');
    expect(ex(4, 0).detectedName).toBe('Prensa de piernas a 45 grados');
    expect(v(ex(3, 1).reps)).toEqual({ min: 10, max: 12 }); // read as "3% 1012"
    expect(ex(3, 1).reps.confidence).toBe('low'); // …so it is marked for review
  });
  test('advice sections and page notes are not exercises', () => {
    const names = r.days.flatMap((d) => d.exercises.map((e) => e.detectedName)).join(' | ');
    expect(names).not.toMatch(/NOTAS|ABDOMEN CON CONTROL|Compuestos|CALIENTA|Sábado/);
    expect(r.unparsed.join(' ')).toMatch(/CALIENTA 10-12 MIN/);
  });
});

describe('exercise matching', () => {
  const catalog = buildCatalog(
    ['Press de Banca', 'Aperturas con Mancuernas', 'Fondos en Paralelas', 'Sentadilla con Barra', 'Hip Thrust', 'Curl con Barra', 'Curl Martillo', 'Curl Concentrado', 'Remo con Barra', 'Remo en Polea Baja']
      .map((name, i) => ({ _id: `id${i}`, name, muscleGroup: 'chest' }))
  );
  const m = (name) => matchExercise(name, catalog);

  test('exact and accent/stopword-insensitive', () => {
    expect(m('PRESS DE BANCA')).toMatchObject({ status: 'auto', confidence: 'high', exercise: { name: 'Press de Banca' } });
    expect(m('Press banca')).toMatchObject({ status: 'auto', confidence: 'high', exercise: { name: 'Press de Banca' } });
    expect(m('Hip thrust')).toMatchObject({ status: 'auto', exercise: { name: 'Hip Thrust' } });
  });
  test('English aliases', () => {
    expect(m('Bench Press')).toMatchObject({ status: 'auto', exercise: { name: 'Press de Banca' } });
    expect(m('Barbell Bench Press')).toMatchObject({ status: 'auto', exercise: { name: 'Press de Banca' } });
    expect(m('Squat')).toMatchObject({ status: 'auto', exercise: { name: 'Sentadilla con Barra' } });
  });
  test('unique partial name and OCR typos are approximate matches', () => {
    expect(m('Aperturas')).toMatchObject({ status: 'auto', confidence: 'medium', exercise: { name: 'Aperturas con Mancuernas' } });
    expect(m('Fondos')).toMatchObject({ status: 'auto', exercise: { name: 'Fondos en Paralelas' } }); // alias
    expect(m('Sentadila con barra')).toMatchObject({ status: 'auto', exercise: { name: 'Sentadilla con Barra' } });
  });
  test('a catalog name plus extra detail is an approximate match', () => {
    const cat = buildCatalog(['Prensa de Piernas', 'Curl Femoral', 'Curl con Barra'].map((name, i) => ({ _id: `c${i}`, name, muscleGroup: 'legs' })));
    expect(matchExercise('Prensa de piernas a 45 grados', cat)).toMatchObject({ status: 'auto', confidence: 'medium', exercise: { name: 'Prensa de Piernas' } });
    expect(matchExercise('Curl femoral sentado', cat)).toMatchObject({ status: 'auto', exercise: { name: 'Curl Femoral' } });
  });
  test('ambiguous names are not chosen silently', () => {
    const r = m('Curl Bíceps');
    expect(r.status).toBe('ambiguous');
    expect(r.exercise).toBeUndefined();
    expect(r.candidates.map((c) => c.name)).toEqual(expect.arrayContaining(['Curl con Barra']));
    expect(m('Remo').status).toBe('ambiguous');
  });
  test('unknown exercise → none', () => {
    expect(m('Landmine rotation')).toMatchObject({ status: 'none' });
  });
});
