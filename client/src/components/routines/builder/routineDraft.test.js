import { describe, expect, it } from 'vitest';
import {
  emptyDraft, isDirty, toggleWeekday, addExercise, updateExercise, removeExercise, moveExercise, validate, toPayload,
} from './routineDraft';

const press = { _id: 'e1', name: 'Press de Banca', muscleGroup: 'chest' };
const remo = { _id: 'e2', name: 'Remo con Barra', muscleGroup: 'back' };

describe('routine draft', () => {
  it('starts clean: nothing to protect or save', () => {
    const d = emptyDraft();
    expect(isDirty(d)).toBe(false);
    expect(validate(d).problems).toEqual(['Ponle un nombre a la rutina', 'Agrega al menos un ejercicio']);
  });

  it('builds, edits, reorders and removes exercises without any server call', () => {
    let d = emptyDraft();
    const day = d.days[0].id;
    d = addExercise(d, day, press);
    d = addExercise(d, day, remo);
    d = addExercise(d, day, press); // already there: ignored
    expect(d.days[0].exercises.map((e) => e.exercise.name)).toEqual(['Press de Banca', 'Remo con Barra']);
    const [a, b] = d.days[0].exercises;
    d = updateExercise(d, day, a.key, { sets: '4', repsMin: '10', repsMax: '', restSeconds: '120', weight: '80' });
    d = moveExercise(d, day, b.key, -1);
    expect(d.days[0].exercises[0].exercise.name).toBe('Remo con Barra');
    d = removeExercise(d, day, b.key);
    expect(d.days[0].exercises).toHaveLength(1);
    expect(isDirty(d)).toBe(true);
  });

  it('validates name, empty days and values', () => {
    let d = toggleWeekday(emptyDraft(), 'jueves');
    d = addExercise(d, d.days[0].id, press);
    d = { ...d, name: 'Torso' };
    expect(validate(d).problems).toContain('Jueves no tiene ejercicios: agrégalos o quita el día');
    d = toggleWeekday(d, 'jueves');
    const key = d.days[0].exercises[0].key;
    d = updateExercise(d, d.days[0].id, key, { sets: '0', repsMax: '4' });
    const v = validate(d);
    expect(v.ok).toBe(false);
    expect(v.fields[key]).toEqual({ sets: '1–20', repsMax: '≥ mín.' });
    d = updateExercise(d, d.days[0].id, key, { sets: '3', repsMax: '12' });
    expect(validate(d).ok).toBe(true);
  });

  it('payload is the normal routine model, in one piece', () => {
    let d = { ...emptyDraft(), name: '  Push  ', description: ' Pecho ', goal: 'strength' };
    d = toggleWeekday(d, 'miercoles');
    d = addExercise(d, d.days[0].id, press);
    d = addExercise(d, d.days[1].id, remo);
    d = updateExercise(d, d.days[0].id, d.days[0].exercises[0].key, { repsMax: '', weight: '62,5', restSeconds: '' });
    expect(toPayload(d)).toEqual({
      name: 'Push', description: 'Pecho', goal: 'strength',
      days: [
        { dayLabel: 'Lunes', exercises: [{ exercise: 'e1', order: 0, sets: 3, repsMin: 8, repsMax: 8, weight: 62.5, restSeconds: 0, notes: '' }] },
        { dayLabel: 'Miércoles', exercises: [{ exercise: 'e2', order: 0, sets: 3, repsMin: 8, repsMax: 12, weight: 0, restSeconds: 90, notes: '' }] },
      ],
    });
  });
});
