/*
 * Reading order for sheets laid out in columns (typically one column per day).
 *
 * Tesseract returns lines across the whole page width: when rows of different
 * columns line up it merges them ("3 × 6-8      3 × 8-12      …"). Here the
 * page is cut into columns by its empty vertical gutters (no dependency on the
 * day names being read), and the text is re-emitted column by column:
 *
 *   [full-width text above the columns]   zone: 'header'  (title, description)
 *   DAY NAME (if read) + column 1 text
 *   DAY NAME + column 2 text …
 *   [full-width text below]               zone: 'footer'  (general notes)
 *
 * Single-column pages keep Tesseract's order. Pure functions (unit-tested).
 */

export const DAY_WORD = /^(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo|monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i;
const clean = (t) => String(t || '').replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '');
const center = (b) => (b.x0 + b.x1) / 2;
const mid = (b) => (b.y0 + b.y1) / 2;
const height = (b) => b.y1 - b.y0;
const realWords = (l) => (l.words || []).filter((w) => w.text && w.text.trim() && w.bbox);
const SHORT_OK = /^(a|y|o|e|en|de|al|la|el|con|del|un|x|kg|s|min|rir|rpe|lb)$/i;
/* Pictures next to the text produce short words the OCR itself doubts ("in", "Eos", "EQ"). */
const isDebris = (w) => {
  const letters = clean(w.text);
  return (w.confidence ?? 100) < 60 && !/\d/.test(w.text) && letters.length <= 3 && !SHORT_OK.test(letters);
};

/* Column intervals [x0, x1] from vertical gutters with (almost) no words. */
export function findColumns(lines) {
  const usable = lines.filter((l) => realWords(l).length);
  if (usable.length < 6) return null;
  const pageX0 = Math.min(...usable.map((l) => l.bbox.x0));
  const pageX1 = Math.max(...usable.map((l) => l.bbox.x1));
  const width = pageX1 - pageX0;
  const bin = Math.max(2, Math.round(width / 600));
  const nb = Math.ceil(width / bin) + 1;
  const cover = new Uint16Array(nb);
  for (const l of usable) {
    const seen = new Uint8Array(nb);
    for (const w of realWords(l)) {
      // Small marks (bullets, stray symbols) don't define columns.
      if (clean(w.text).length < 2 && !/\d/.test(w.text)) continue;
      for (let b = Math.floor((w.bbox.x0 - pageX0) / bin); b <= Math.floor((w.bbox.x1 - pageX0) / bin); b++) {
        if (b >= 0 && b < nb) seen[b] = 1;
      }
    }
    for (let b = 0; b < nb; b++) cover[b] += seen[b];
  }
  // Full-width sentences (title, footnotes) cross the gutters: tolerate a few.
  const limit = Math.max(1, Math.floor(usable.length * 0.2));
  const gutters = [];
  let start = -1;
  for (let b = 0; b <= nb; b++) {
    const low = b < nb && cover[b] <= limit;
    if (low && start < 0) start = b;
    if (!low && start >= 0) {
      const g0 = pageX0 + start * bin;
      const g1 = pageX0 + b * bin;
      if (start > 0 && b < nb && g1 - g0 >= width * 0.005) gutters.push([g0, g1]);
      start = -1;
    }
  }
  if (!gutters.length) return null;
  const cols = [];
  let x = pageX0;
  for (const [g0, g1] of gutters) {
    cols.push([x, g0]);
    x = g1;
  }
  cols.push([x, pageX1]);
  // Slivers (a few stray marks past a gutter) belong to their neighbour column.
  const median = [...cols.map(([a, b]) => b - a)].sort((a, b) => a - b)[Math.floor(cols.length / 2)];
  for (let i = 0; i < cols.length; i++) {
    if (cols.length > 1 && cols[i][1] - cols[i][0] < median * 0.4) {
      const j = i === 0 ? 1 : i === cols.length - 1 ? i - 1 : (cols[i - 1][1] - cols[i - 1][0] < cols[i + 1][1] - cols[i + 1][0] ? i - 1 : i + 1);
      cols[j] = [Math.min(cols[i][0], cols[j][0]), Math.max(cols[i][1], cols[j][1])];
      cols.splice(i, 1);
      i = -1;
    }
  }
  // Real columns are wide and similar: drop the result otherwise (tables, ragged text).
  const widths = cols.map(([a, b]) => b - a);
  const minW = Math.min(...widths);
  const maxW = Math.max(...widths);
  if (cols.length < 2 || cols.length > 7 || minW < width * 0.1 || maxW > minW * 2.2) return null;
  return cols;
}

/* Day names standing alone (not inside a sentence like "Sábado y domingo: …"). */
function dayWords(lines) {
  const out = [];
  for (const l of lines) {
    const words = realWords(l);
    for (const w of words) {
      if (!DAY_WORD.test(clean(w.text))) continue;
      const gap = 2.5 * height(w.bbox);
      const crowded = words.some((o) => o !== w && !DAY_WORD.test(clean(o.text)) && clean(o.text).length > 0 &&
        ((o.bbox.x0 >= w.bbox.x1 && o.bbox.x0 - w.bbox.x1 < gap) || (o.bbox.x1 <= w.bbox.x0 && w.bbox.x0 - o.bbox.x1 < gap)));
      if (!crowded) out.push({ text: clean(w.text), bbox: w.bbox });
    }
  }
  return out;
}

const joinWords = (words) => words.map((w) => w.text).join(' ').replace(/\s+/g, ' ').trim();
const meanConf = (words) => Math.round(words.reduce((s, w) => s + (w.confidence ?? 0), 0) / Math.max(1, words.length));

/*
 * Returns { lines, columns, missingDayNames, dayBand } where `dayBand` is the
 * strip above the columns to read again when the day names were not recognised.
 */
export function analyzeLayout(raw) {
  const lines = (raw || []).filter((l) => l.text && l.text.trim() && l.bbox && realWords(l).length);
  const cols = findColumns(lines);
  if (!cols) return { lines: (raw || []).map((l) => ({ text: l.text, confidence: l.confidence ?? null })), columns: null };

  const colOf = (x) => {
    let best = 0;
    let dist = Infinity;
    cols.forEach(([a, b], i) => {
      const d = x < a ? a - x : x > b ? x - b : 0;
      if (d < dist) { dist = d; best = i; }
    });
    return best;
  };
  const colWidth = Math.min(...cols.map(([a, b]) => b - a));

  // Classify lines: inside columns, or full-width text (normal word spacing across a gutter).
  const inCols = [];
  const wide = [];
  for (const l of lines) {
    const ws = realWords(l).sort((a, b) => a.bbox.x0 - b.bbox.x0);
    const parts = new Map();
    for (const w of ws) {
      const c = colOf(center(w.bbox));
      if (!parts.has(c)) parts.set(c, []);
      parts.get(c).push(w);
    }
    if (parts.size > 1) {
      const lineH = Math.max(height(l.bbox), 8);
      let normalSpacing = true;
      for (let i = 1; i < ws.length; i++) {
        if (colOf(center(ws[i].bbox)) !== colOf(center(ws[i - 1].bbox)) && ws[i].bbox.x0 - ws[i - 1].bbox.x1 > 1.2 * lineH) normalSpacing = false;
      }
      if (normalSpacing && l.bbox.x1 - l.bbox.x0 > 1.4 * colWidth) {
        wide.push(l);
        continue;
      }
    }
    inCols.push({ l, parts });
  }
  if (!inCols.length) return { lines: (raw || []).map((l) => ({ text: l.text, confidence: l.confidence ?? null })), columns: null };

  const colTop = Math.min(...inCols.map(({ l }) => l.bbox.y0));
  const colBottom = Math.max(...inCols.map(({ l }) => l.bbox.y1));
  const header = wide.filter((l) => l.bbox.y1 <= colTop + 2).sort((a, b) => a.bbox.y0 - b.bbox.y0);
  const footer = wide.filter((l) => l.bbox.y1 > colTop + 2).sort((a, b) => a.bbox.y0 - b.bbox.y0);

  const columns = cols.map(() => []);
  for (const { l, parts } of inCols) {
    for (const [c, words] of parts) {
      const kept = words.filter((w) => !isDebris(w));
      if (!kept.length) continue;
      columns[c].push({ y: mid(l.bbox), text: joinWords(kept), confidence: meanConf(kept) });
    }
  }

  // Day names: one per column, from the OCR words (if they were read).
  const days = cols.map(() => null);
  for (const d of dayWords(lines)) {
    const c = colOf(center(d.bbox));
    if (!days[c] || d.bbox.y0 < days[c].bbox.y0) days[c] = d;
  }
  const found = days.filter(Boolean).length;

  const out = [];
  header.forEach((l) => out.push({ text: l.text, confidence: l.confidence, zone: 'header' }));
  columns.forEach((col, i) => {
    out.push({ text: '', confidence: null });
    col.sort((a, b) => a.y - b.y);
    const hasDayLine = col.some((l) => DAY_WORD.test(clean(l.text)));
    if (days[i] && !hasDayLine) out.push({ text: days[i].text, confidence: 90 });
    // No day name at all: each column still starts a new day ("Día N", or its subtitle).
    if (!days[i] && !hasDayLine) out.push({ text: `Día ${i + 1}`, confidence: 90, synthetic: true });
    col.forEach((l) => out.push({ text: l.text, confidence: l.confidence }));
  });
  out.push({ text: '', confidence: null });
  footer.forEach((l) => out.push({ text: l.text, confidence: l.confidence, zone: 'footer' }));

  const lastHeader = header.length ? Math.max(...header.map((l) => l.bbox.y1)) : Math.max(0, colTop - 6 * Math.max(...inCols.map(({ l }) => height(l.bbox))));
  return {
    lines: out,
    columns: cols,
    missingDayNames: found < cols.length,
    dayBand: { left: Math.max(0, cols[0][0] - 10), top: Math.max(0, Math.floor(lastHeader)), width: Math.ceil(cols[cols.length - 1][1] - cols[0][0] + 20), height: Math.max(10, Math.ceil(colTop - lastHeader)) },
    colBottom,
  };
}

/* Merges words read from the day band into the raw lines, then lays out again. */
export function withDayBand(raw, bandLines) {
  const days = dayWords(bandLines || []);
  if (!days.length) return raw;
  return [...raw, { text: days.map((d) => d.text).join('   '), confidence: 90, bbox: {
    x0: Math.min(...days.map((d) => d.bbox.x0)), x1: Math.max(...days.map((d) => d.bbox.x1)),
    y0: Math.min(...days.map((d) => d.bbox.y0)), y1: Math.max(...days.map((d) => d.bbox.y1)),
  }, words: days.map((d) => ({ text: d.text, confidence: 90, bbox: d.bbox })) }];
}

export function layoutLines(raw) {
  return analyzeLayout(raw).lines;
}
