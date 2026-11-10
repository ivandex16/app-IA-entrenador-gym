import { describe, expect, it } from 'vitest';
import { stateFromDraft, updateRow, validate, toRoutinePayload, emptyRow } from './reviewModel';

const draft = {
  name: { value: 'Torso', confidence: 'high' },
  days: [{
    label: 'Lunes - Pecho',
    exercises: [
      { detectedName: 'Press banca', sourceText: ['Press banca 4x10 90s'], match: { status: 'auto', confidence: 'high', exercise: { _id: 'e1', name: 'Press de Banca' }, candidates: [] },
        sets: { value: 4, confidence: 'high' }, reps: { value: { min: 10, max: 10 }, confidence: 'high' }, weight: null, restSeconds: { value: 90, confidence: 'high' },
        rir: { value: '2', confidence: 'high' }, rpe: null, tempo: null, superset: 'A', notes: ['controlado'], reviewReasons: [] },
      { detectedName: 'Curl', sourceText: ['Curl 3x8-12'], match: { status: 'ambiguous', candidates: [{ _id: 'e2', name: 'Curl con Barra' }] },
        sets: { value: 3, confidence: 'low' }, reps: { value: { min: 8, max: 12 }, confidence: 'high' }, weight: null, restSeconds: null,
        rir: null, rpe: null, tempo: null, superset: null, notes: [], reviewReasons: ['exercise', 'sets'] },
    ],
  }],
  unparsed: ['???'],
};

describe('review model', () => {
  it('maps the draft: auto match selected, ambiguous left empty, missing fields empty', () => {
    const s = stateFromDraft(draft);
    const [a, b] = s.days[0].exercises;
    expect(s.name).toBe('Torso');
    expect([a.exerciseId, a.sets, a.repsMin, a.repsMax, a.weight, a.restSeconds]).toEqual(['e1', '4', '10', '', '', '90']);
    expect([b.exerciseId, b.repsMin, b.repsMax, b.review]).toEqual(['', '8', '12', ['exercise', 'sets']]);
  });

  it('blocks saving until every exercise is assigned and has sets and reps', () => {
    const s = stateFromDraft(draft);
    let v = validate(s);
    expect(v.ok).toBe(false);
    expect(v.rows[s.days[0].exercises[1].id]).toEqual({ exerciseId: 'Elige el ejercicio' });
    s.days[0].exercises[1] = updateRow(s.days[0].exercises[1], { exerciseId: 'e2' });
    expect(s.days[0].exercises[1].review).toEqual(['sets']); // reviewing a field clears its flag
    v = validate(s);
    expect(v.ok).toBe(true);
    s.days[0].exercises.push(emptyRow());
    expect(validate(s).ok).toBe(false);
  });

  it('produces the normal routine payload; empty weight/rest are not invented', () => {
    const s = stateFromDraft(draft);
    s.days[0].exercises[1] = updateRow(s.days[0].exercises[1], { exerciseId: 'e2' });
    const p = toRoutinePayload(s);
    expect(p).toMatchObject({ name: 'Torso', goal: 'general', exercises: [], description: 'Importada desde imagen' });
    expect(p.days[0]).toEqual({
      dayLabel: 'Lunes - Pecho',
      exercises: [
        { exercise: 'e1', order: 0, sets: 4, repsMin: 10, repsMax: 10, weight: 0, restSeconds: 90, notes: 'controlado · RIR 2 · Superserie A' },
        { exercise: 'e2', order: 1, sets: 3, repsMin: 8, repsMax: 12, weight: 0, restSeconds: 0, notes: '' },
      ],
    });
  });
});
