import { describe, expect, it } from 'vitest';
import { searchExercises } from './exerciseSearch';

const catalog = [
  'Remo sentado (máquina)', 'Remo con Barra', 'Remo en Polea Baja', 'Press de Banca', 'Press Inclinado con Mancuernas',
  'Jalón al pecho', 'Jalón al pecho con agarre neutro', 'Elevaciones Laterales', 'Elevación lateral en polea alta', 'Pájaro para deltoides posterior en máquina pec deck',
].map((name, i) => ({ _id: `e${i}`, name }));
const names = (q, limit) => searchExercises(catalog, q, limit).map((e) => e.name);

describe('searchExercises', () => {
  it('ignores accents and case, and every word may be anywhere', () => {
    expect(names('remo maquina')).toEqual(['Remo sentado (máquina)']);
    expect(names('JALON')).toEqual(['Jalón al pecho', 'Jalón al pecho con agarre neutro']);
    expect(names('pajaro')).toEqual(['Pájaro para deltoides posterior en máquina pec deck']);
    expect(names('polea lateral')).toEqual(['Elevación lateral en polea alta']);
  });

  it('names starting with the query come first, then shorter names', () => {
    expect(names('press')).toEqual(['Press de Banca', 'Press Inclinado con Mancuernas']);
    expect(names('banca')[0]).toBe('Press de Banca');
    expect(names('remo')).toEqual(['Remo con Barra', 'Remo en Polea Baja', 'Remo sentado (máquina)']);
  });

  it('no match → empty; empty query → the list as it is, up to the limit', () => {
    expect(names('sentadilla')).toEqual([]);
    expect(names('', 3)).toEqual(['Remo sentado (máquina)', 'Remo con Barra', 'Remo en Polea Baja']);
    expect(names('  ')).toHaveLength(catalog.length);
  });
});
