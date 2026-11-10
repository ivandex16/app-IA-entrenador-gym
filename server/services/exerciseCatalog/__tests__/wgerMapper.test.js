const { mapWgerExercise, mapAll, htmlToText } = require('../wgerMapper');
const { buildCatalog, matchExercise } = require('../../routineImport/matchExercises');
const sample = require('./fixtures/wger-sample.json').results;

const byId = (id) => sample.find((e) => e.id === id);

describe('wger → Exercise', () => {
  test('Spanish name, muscle group, equipment, aliases and credit', () => {
    const doc = mapWgerExercise(byId(12));
    expect(doc).toMatchObject({
      name: 'Aducción de Cadera en Máquina',
      equipment: 'machine',
      difficulty: 'intermediate',
      source: { provider: 'wger', externalId: '12', url: 'https://wger.de/exercise/12/view/' },
    });
    expect(doc.source.license).toMatch(/^CC/);
    expect(doc.source.author).toBeTruthy();
    expect(doc.aliases).toContain('Seated Hip Adduction');
    expect(doc.instructions.length).toBeGreaterThan(0);
    expect(doc.description).not.toMatch(/<[a-z]/i);
  });
  test('only exercises with a Spanish translation are imported', () => {
    expect(mapWgerExercise(byId(9))).toBeNull();
    expect(mapAll(sample)).toHaveLength(3);
  });
  test('values always fit the Exercise model enums', () => {
    const Exercise = require('../../../models/Exercise');
    const groups = Exercise.schema.path('muscleGroup').enumValues;
    const equipment = Exercise.schema.path('equipment').enumValues;
    for (const d of mapAll(sample)) {
      expect(groups).toContain(d.muscleGroup);
      expect(equipment).toContain(d.equipment);
      d.secondaryMuscles.forEach((g) => expect(groups).toContain(g));
    }
  });
  test('HTML description → text and steps', () => {
    const r = htmlToText('<p>Ejercicio de <strong>pecho</strong> &amp; hombro, muy completo para empezar.</p><ol><li><strong>Inicio:</strong> túmbate</li><li>Baja la barra</li></ol>');
    expect(r).toEqual({ description: 'Ejercicio de pecho & hombro, muy completo para empezar.', instructions: ['túmbate', 'Baja la barra'] });
  });
});

describe('imported names help the image import', () => {
  const catalog = buildCatalog(mapAll(sample).map((d, i) => ({ ...d, _id: `w${i}` })));
  test('English names match through aliases', () => {
    expect(matchExercise('Biceps Curls With Dumbbell', catalog)).toMatchObject({ status: 'auto', exercise: { name: 'Curl de bíceps con mancuerna' } });
    expect(matchExercise('Reverse crunch', catalog)).toMatchObject({ status: 'auto', exercise: { name: 'Crunch inverso' } });
  });
  test('abducción is never taken for aducción (opposite movements)', () => {
    const r = matchExercise('Abducción de cadera en máquina', catalog);
    expect(r.exercise?.name).not.toBe('Aducción de Cadera en Máquina');
  });
});
