import { describe, expect, it } from 'vitest';
import { exerciseThumb, exerciseImage, youtubeThumb } from './exerciseImages';
import { pageWindow } from './Pagination';

describe('exercise images', () => {
  it('prefers the small thumbnail, then the image', () => {
    expect(exerciseThumb({ name: 'X', thumbnailUrl: 't.png', imageUrl: 'i.png' })).toBe('t.png');
    expect(exerciseThumb({ name: 'X', imageUrl: 'i.png' })).toBe('i.png');
    expect(exerciseImage({ name: 'X', thumbnailUrl: 't.png', imageUrl: 'i.png' })).toBe('i.png');
  });
  it('known classic exercises of the original catalog get their picture', () => {
    expect(exerciseThumb({ name: 'Press de Banca', muscleGroup: 'chest' })).toMatch(/Barbell_Bench_Press/);
  });
  it('imported exercises without picture are not given another exercise picture', () => {
    expect(exerciseThumb({ name: 'Sentadilla en pared', muscleGroup: 'legs', source: { provider: 'wger' } })).toBeNull();
  });
  it('a YouTube video frame is used when there is nothing else', () => {
    expect(exerciseThumb({ name: 'Ejercicio raro', youtubeVideoId: 'abc123' })).toBe(youtubeThumb('abc123'));
  });
  it('nothing at all → null (placeholder)', () => {
    expect(exerciseThumb({ name: 'Ejercicio raro', muscleGroup: 'chest' })).toBeNull();
    expect(exerciseThumb(null)).toBeNull();
  });
});

describe('pagination window', () => {
  it('shows first, last and neighbours with gaps', () => {
    expect(pageWindow(1, 1)).toEqual([1]);
    expect(pageWindow(1, 5)).toEqual([1, 2, '…', 5]);
    expect(pageWindow(6, 29)).toEqual([1, '…', 5, 6, 7, '…', 29]);
    expect(pageWindow(3, 5)).toEqual([1, 2, 3, 4, 5]);
  });
});
