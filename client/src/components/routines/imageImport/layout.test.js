import { describe, expect, it } from 'vitest';
import { analyzeLayout, findColumns, withDayBand } from './layout';
import weekly from './__fixtures__/weekly-sheet.ocr.json';

// Real Tesseract output for a 5-column weekly sheet (LUNES…VIERNES), where the
// OCR merged the rows of all columns into single lines and skipped the day band.
describe('multi-column layout', () => {
  it('finds the five day columns from the gutters', () => {
    const lines = weekly.filter((l) => l.words?.length);
    expect(findColumns(lines)).toHaveLength(5);
  });

  it('re-reads the page column by column, with title above and notes below', () => {
    const { lines, columns, missingDayNames } = analyzeLayout(weekly);
    expect(columns).toHaveLength(5);
    expect(missingDayNames).toBe(true);
    const text = lines.map((l) => l.text);
    const at = (s) => text.findIndex((t) => t.includes(s));
    expect(lines[0]).toMatchObject({ zone: 'header' });
    expect(text.filter((t) => /^Día \d$/.test(t))).toEqual(['Día 1', 'Día 2', 'Día 3', 'Día 4', 'Día 5']);
    // Each exercise ends up under its own day, in reading order.
    expect(at('Día 1')).toBeLessThan(at('Sentadilla en Smith'));
    expect(at('Sentadilla en Smith')).toBeLessThan(at('Hip thrust'));
    expect(at('Hip thrust')).toBeLessThan(at('Día 2'));
    expect(at('Día 2')).toBeLessThan(at('Jalón al pecho'));
    expect(at('Día 5')).toBeLessThan(at('Prensa de piernas'));
    expect(lines.filter((l) => l.zone === 'footer').map((l) => l.text)[0]).toMatch(/^CALIENTA/);
  });

  it('uses day names read from the band in a second pass', () => {
    const { dayBand } = analyzeLayout(weekly);
    const y = dayBand.top + dayBand.height / 2;
    const xs = [280, 870, 1430, 2030, 2670];
    const names = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES'];
    const band = [{ text: names.join('   '), confidence: 90, bbox: { x0: 200, x1: 2800, y0: y - 15, y1: y + 15 },
      words: names.map((n, i) => ({ text: n, confidence: 92, bbox: { x0: xs[i] - 60, x1: xs[i] + 60, y0: y - 15, y1: y + 15 } })) }];
    const { lines, missingDayNames } = analyzeLayout(withDayBand(weekly, band));
    expect(missingDayNames).toBe(false);
    expect(lines.filter((l) => /^(LUNES|MARTES|MIÉRCOLES|JUEVES|VIERNES)$/.test(l.text)).map((l) => l.text)).toEqual(names);
  });

  it('a normal single-column page keeps the OCR order', () => {
    const raw = ['Press banca 4x10', 'Sentadilla 3x8'].map((text, i) => ({ text, confidence: 90, bbox: { x0: 10, x1: 400, y0: i * 40, y1: i * 40 + 30 }, words: [{ text, confidence: 90, bbox: { x0: 10, x1: 400, y0: i * 40, y1: i * 40 + 30 } }] }));
    expect(analyzeLayout(raw)).toMatchObject({ columns: null, lines: [{ text: 'Press banca 4x10' }, { text: 'Sentadilla 3x8' }] });
  });
});
