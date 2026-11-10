import { describe, expect, it } from 'vitest';
import { findPixelColumns, inferColumnDays, looksLikeDayColumns, weekdayOf } from './pixelColumns';

/* White page with "text" (random dark marks) inside the given boxes. */
function page(w, h, boxes) {
  const g = new Uint8Array(w * h).fill(250);
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (const [x0, y0, x1, y1] of boxes) {
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (rnd() < 0.35) g[y * w + x] = 20;
  }
  return g;
}

describe('findPixelColumns', () => {
  it('finds side-by-side panels, below a full-width title and above full-width notes', () => {
    const w = 900;
    const h = 600;
    const g = page(w, h, [
      [20, 10, 880, 50], // title across the page
      [20, 80, 280, 520], [310, 80, 580, 520], [610, 80, 880, 520], // three day panels
      [20, 550, 880, 590], // notes across the page
    ]);
    const r = findPixelColumns(g, w, h);
    expect(r.columns).toHaveLength(3);
    expect(r.columns[0][1]).toBeGreaterThanOrEqual(280);
    expect(r.columns[1][0]).toBeLessThanOrEqual(310);
    expect(r.top).toBeLessThanOrEqual(80);
    expect(r.top).toBeGreaterThanOrEqual(45);
    expect(r.bottom).toBeGreaterThanOrEqual(520);
  });

  it('ignores the short gap between a text and its drawing inside a panel', () => {
    const w = 900;
    const h = 600;
    const g = page(w, h, [
      [20, 60, 280, 100], [310, 60, 580, 100], [610, 60, 880, 100], // day headings cross each panel
      [20, 100, 180, 560], [220, 100, 280, 560], // text | drawing
      [310, 100, 470, 560], [510, 100, 580, 560],
      [610, 100, 770, 560], [810, 100, 880, 560],
    ]);
    expect(findPixelColumns(g, w, h).columns).toHaveLength(3);
  });

  it('a single block of text, or a name | numbers table, is not split', () => {
    expect(findPixelColumns(page(900, 600, [[40, 40, 700, 560]]), 900, 600)).toBeNull();
    // Wide names column + narrow numbers column: very different widths.
    expect(findPixelColumns(page(900, 600, [[40, 40, 560, 560], [640, 40, 760, 560]]), 900, 600)).toBeNull();
  });
});

describe('day names of columns', () => {
  it('recognises misread weekday names, and nothing else', () => {
    expect(weekdayOf('MARMES')).toBe(1);
    expect(weekdayOf('MIERGOIES')).toBe(2);
    expect(weekdayOf('JUEVES')).toBe(3);
    expect(weekdayOf('Viernes')).toBe(4);
    expect(weekdayOf('DOMINADAS')).toBe(-1);
    expect(weekdayOf('JALÓN AL PECHO')).toBe(-1);
    expect(weekdayOf('3 series | 8-10 rep')).toBe(-1);
  });

  it('fills unreadable day names from the ones read in the other columns', () => {
    const col = (first) => [{ text: first }, { text: 'PRESS BANCA' }, { text: '3 series | 8-10 rep' }];
    const days = inferColumnDays([col('MNES y'), col('MARMES'), col('MIERGOIES'), col('JUEVES'), col('WZIE RN ESS')]);
    expect(days.map((d) => d.label)).toEqual(['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']);
    expect(days.map((d) => d.dayLine)).toEqual([-1, 0, 0, 0, -1]);
  });

  it('without any day name, columns are Día 1…N', () => {
    const col = [{ text: 'Sentadilla' }, { text: '3x10' }];
    expect(inferColumnDays([col, col]).map((d) => d.label)).toEqual(['Día 1', 'Día 2']);
  });

  it('day columns have words and numbers; split table halves do not', () => {
    const day = [{ text: 'PRESS BANCA' }, { text: 'REMO CON BARRA' }, { text: '3 series | 8-10 rep' }];
    expect(looksLikeDayColumns([day, day])).toBe(true);
    expect(looksLikeDayColumns([[{ text: 'Press de banca' }, { text: 'Remo con barra' }], [{ text: '4 x 10' }, { text: '4 x 8' }]])).toBe(false);
  });
});
