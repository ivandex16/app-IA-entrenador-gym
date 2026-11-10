/*
 * Columns found in the image itself (pixels), not in the OCR words.
 *
 * Dense sheets (one panel per day, with drawings next to each exercise) make
 * the OCR invent "words" from the drawings; those fill the gaps between days and
 * the word-based layout (layout.js) sees a single column. The gaps between the
 * panels are still there in the pixels: vertical strips whose colour doesn't
 * change from top to bottom of the panel area.
 *
 * Pure functions on a grayscale buffer (unit-tested).
 */

const SLICES = 40;
const FLAT_STD = 14; // a strip of background (or a straight border) barely changes

/*
 * gray: Uint8Array/Uint8ClampedArray of w*h luminance values.
 * Returns { columns: [[x0, x1], …], top, bottom } in pixels, or null when the
 * image isn't made of 2–7 side-by-side panels of similar width.
 */
export function findPixelColumns(gray, w, h) {
  if (!gray || w < 200 || h < 100) return null;
  const sliceH = h / SLICES;
  const sum = new Float64Array(SLICES * w);
  const sq = new Float64Array(SLICES * w);
  const n = new Uint32Array(SLICES);
  for (let y = 0; y < h; y++) {
    const s = Math.min(SLICES - 1, Math.floor(y / sliceH));
    n[s] += 1;
    const row = y * w;
    const base = s * w;
    for (let x = 0; x < w; x++) {
      const v = gray[row + x];
      sum[base + x] += v;
      sq[base + x] += v * v;
    }
  }
  // Longest run of "flat" slices for every x.
  const runLen = new Uint16Array(w);
  const runStart = new Uint16Array(w);
  let anyContent0 = -1;
  let anyContent1 = -1;
  for (let x = 0; x < w; x++) {
    let best = 0;
    let bestStart = 0;
    let cur = 0;
    let curStart = 0;
    let flatCount = 0;
    for (let s = 0; s < SLICES; s++) {
      const m = sum[s * w + x] / n[s];
      const std = Math.sqrt(Math.max(0, sq[s * w + x] / n[s] - m * m));
      if (std < FLAT_STD) {
        if (cur === 0) curStart = s;
        cur += 1;
        flatCount += 1;
        if (cur > best) { best = cur; bestStart = curStart; }
      } else cur = 0;
    }
    runLen[x] = best;
    runStart[x] = bestStart;
    if (flatCount < SLICES) {
      if (anyContent0 < 0) anyContent0 = x;
      anyContent1 = x;
    }
  }
  if (anyContent0 < 0) return null;
  const left = anyContent0;
  const right = anyContent1 + 1;
  const width = right - left;

  // Candidate gutters: strips flat for a long stretch, away from the page edges.
  const minRun = Math.ceil(SLICES * 0.45);
  const raw = [];
  let g0 = -1;
  for (let x = left; x <= right; x++) {
    const flat = x < right && runLen[x] >= minRun;
    if (flat && g0 < 0) g0 = x;
    if (!flat && g0 >= 0) {
      if (g0 > left + width * 0.03 && x < right - width * 0.03 && x - g0 >= Math.max(2, Math.round(w * 0.002))) {
        let len = 0;
        let start = 0;
        for (let k = g0; k < x; k++) if (runLen[k] > len) { len = runLen[k]; start = runStart[k]; }
        raw.push({ x0: g0, x1: x, len, start });
      }
      g0 = -1;
    }
  }
  if (!raw.length) return null;
  // A panel's border line splits its gap in two: join pieces that close.
  const merged = [];
  for (const g of raw) {
    const last = merged[merged.length - 1];
    if (last && g.x0 - last.x1 <= width * 0.01) {
      last.x1 = g.x1;
      if (g.len > last.len) { last.len = g.len; last.start = g.start; }
    } else merged.push({ ...g });
  }
  // The gaps between day panels run the whole panel height; strips inside a
  // panel (its padding, the space between a text and its drawing) are cut by
  // the panel's own headings, so they are shorter. From lenient to strict, the
  // first set of gaps that leaves panels of similar width wins.
  const longest = Math.max(...merged.map((g) => g.len));
  for (const ratio of [0.8, 0.9, 1]) {
    const gutters = merged.filter((g) => g.len >= longest * ratio);
    const columns = [];
    let x = left;
    for (const g of gutters) {
      columns.push([x, g.x0]);
      x = g.x1;
    }
    columns.push([x, right]);
    const widths = columns.map(([a, b]) => b - a);
    const minW = Math.min(...widths);
    const maxW = Math.max(...widths);
    if (columns.length < 2 || columns.length > 7 || minW < width * 0.1 || maxW > minW * 1.6) continue;
    // Vertical extent shared by all the gutters = the panel area.
    const sTop = Math.max(...gutters.map((g) => g.start));
    const sBottom = Math.min(...gutters.map((g) => g.start + g.len));
    if (sBottom - sTop < minRun) continue;
    return { columns, top: Math.floor(sTop * sliceH), bottom: Math.min(h, Math.ceil(sBottom * sliceH)) };
  }
  return null;
}

/* ── Day names for columns read one by one ─────────────────────────────── */

const WEEK = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
const LABEL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const letters = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/gi, '').toLowerCase();

function distance(a, b) {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

/* Weekday index for a short line that is (a misreading of) a day name: "MARMES" → 1. */
export function weekdayOf(text) {
  const words = String(text || '').trim().split(/\s+/).filter((w) => letters(w).length >= 3);
  if (!words.length || words.length > 2) return -1;
  const t = letters(words[0]);
  if (t.length < 4) return -1;
  let best = -1;
  let bestD = Infinity;
  WEEK.forEach((d, i) => {
    if (Math.abs(d.length - t.length) > 2) return;
    const dist = distance(t, d);
    if (dist < bestD) { bestD = dist; best = i; }
  });
  return bestD <= Math.max(1, Math.floor(WEEK[best]?.length * 0.25)) ? best : -1;
}

/*
 * For each column (its OCR lines, top to bottom) → { label, dayLine } where
 * dayLine is the index of the line that held the day name (to drop it).
 * Days read in some columns fill the others when they form a run of the week
 * ("?, MARTES, MIÉRCOLES, JUEVES, ?" → Lunes … Viernes); otherwise "Día N".
 */
export function inferColumnDays(columns) {
  const found = columns.map((lines) => {
    for (let i = 0; i < Math.min(4, lines.length); i++) {
      const d = weekdayOf(lines[i].text);
      if (d >= 0) return { day: d, line: i };
    }
    return { day: -1, line: -1 };
  });
  // Offset that agrees with most of the days read: column i ↔ weekday i + offset.
  const votes = new Map();
  found.forEach((f, i) => f.day >= 0 && votes.set(f.day - i, (votes.get(f.day - i) || 0) + 1));
  let offset = null;
  let bestVotes = 0;
  for (const [o, v] of votes) if (v > bestVotes) { bestVotes = v; offset = o; }
  const consistent = offset !== null && bestVotes >= Math.max(1, Math.ceil(found.filter((f) => f.day >= 0).length / 2)) &&
    offset >= 0 && offset + columns.length <= 7;
  return found.map((f, i) => {
    if (consistent) return { label: LABEL[offset + i], dayLine: f.day === offset + i ? f.line : -1 };
    if (f.day >= 0) return { label: LABEL[f.day], dayLine: f.line };
    return { label: `Día ${i + 1}`, dayLine: -1, synthetic: true };
  });
}

/*
 * Columns read one by one must look like days of exercises: some lines with
 * words and some with numbers. A "name | 4 x 10" table split in two fails this
 * (one side has no numbers, the other no words), and the page is read whole.
 */
export function looksLikeDayColumns(columns) {
  return columns.length >= 2 && columns.every((lines) => {
    const wordy = lines.filter((l) => letters(l.text).length >= 4).length;
    const numeric = lines.filter((l) => /\d/.test(l.text)).length;
    return wordy >= 2 && numeric >= 1;
  });
}
