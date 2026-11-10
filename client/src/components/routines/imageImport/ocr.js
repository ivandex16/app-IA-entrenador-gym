/*
 * OCR in the browser with Tesseract (tesseract.js): free, no API key, and the
 * image never leaves the device. The library (~a few MB of WebAssembly + the
 * Spanish/English language data) is loaded only when the user opens the image
 * import, then cached by the browser.
 */
import { analyzeLayout, withDayBand } from './layout';
import { findPixelColumns, inferColumnDays, looksLikeDayColumns } from './pixelColumns';
import { preprocess } from './prepareImage';

/* kind: 'engine' (the OCR couldn't be downloaded/started) | 'read' (it failed on this image). */
export class OcrError extends Error {
  constructor(kind, cause) {
    super(kind === 'engine' ? 'OCR engine unavailable' : 'OCR failed');
    this.kind = kind;
    this.cause = cause;
  }
}

/* Tesseract result → [{ text, confidence, bbox, words }] in reading order. */
function toLines(data) {
  const raw = [];
  for (const block of data.blocks || []) {
    for (const para of block.paragraphs || []) {
      for (const line of para.lines || []) {
        const text = line.text.replace(/\n$/, '');
        if (!text.trim()) continue;
        raw.push({
          text,
          confidence: Math.round(line.confidence),
          bbox: line.bbox,
          words: (line.words || []).map((w) => ({ text: w.text, confidence: Math.round(w.confidence), bbox: w.bbox })),
        });
      }
    }
    raw.push({ text: '', confidence: null, blockEnd: true }); // block boundary (ends a superset block)
  }
  return raw;
}

let workerPromise = null;
let progressListener = null;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = import('tesseract.js')
      .then(({ createWorker }) =>
        createWorker(['spa', 'eng'], 1, {
          logger: (m) => progressListener?.(m),
        })
      )
      .then(async (worker) => {
        // Keep runs of spaces: wide gaps separate table columns.
        await worker.setParameters({ preserve_interword_spaces: '1' });
        return worker;
      })
      .catch((err) => {
        workerPromise = null;
        throw err;
      });
  }
  return workerPromise;
}

/* Starts downloading the OCR engine early (when the panel opens). */
export function warmUpOcr() {
  getWorker().catch(() => {});
}

/*
 * Recognizes the image. Returns { lines: [{ text, confidence }], text, confidence }.
 * onProgress receives 0..1 while reading.
 */
export async function recognizeLines(image, onProgress) {
  progressListener = (m) => {
    if (m.status === 'recognizing text') onProgress?.(m.progress);
  };
  try {
    let worker;
    try {
      worker = await getWorker();
    } catch (err) {
      throw new OcrError('engine', err);
    }
    let data;
    try {
      ({ data } = await worker.recognize(image, { rotateAuto: true }, { text: true, blocks: true }));
    } catch (err) {
      throw new OcrError('read', err);
    }
    // Lines with their position and words: the layout step uses them to read
    // multi-column sheets (one column per day) column by column.
    let raw = toLines(data);
    let layout = analyzeLayout(raw);
    // Day names on coloured bands are sometimes skipped by the page analysis:
    // read just that strip again (a second, small pass).
    if (layout.columns && layout.missingDayNames && layout.dayBand?.height > 8) {
      onProgress?.(1);
      try {
        const band = await worker.recognize(image, { rectangle: layout.dayBand }, { blocks: true });
        const merged = withDayBand(raw, toLines(band.data));
        if (merged !== raw) {
          raw = merged;
          layout = analyzeLayout(raw);
        }
      } catch {
        // keep the first reading
      }
    }
    return { lines: layout.lines, raw, columns: layout.columns?.length || 1, text: data.text || '', confidence: Math.round(data.confidence || 0) };
  } finally {
    progressListener = null;
  }
}

function grayOf(canvas) {
  const { width: w, height: h } = canvas;
  const d = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
  const g = new Uint8Array(w * h);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) g[p] = d[i]; // already grayscale
  return g;
}

async function readCrop(bitmap, sx, sy, sw, sh, onProgress) {
  // Kept inside the image: an area past the edge would come back transparent (black).
  const x = Math.max(0, Math.round(sx));
  const y = Math.max(0, Math.round(sy));
  const w = Math.max(1, Math.min(bitmap.width - x, Math.round(sw)));
  const h = Math.max(1, Math.min(bitmap.height - y, Math.round(sh)));
  const crop = await createImageBitmap(bitmap, x, y, w, h);
  try {
    // Same enlargement (×2) and reading as a whole page: measured better than ×3,
    // which blurs the small letters of dense sheets.
    const { canvas } = preprocess(crop);
    const r = await recognizeLines(canvas, onProgress);
    return { lines: r.lines.map((l) => ({ text: l.text, confidence: l.confidence })), confidence: r.confidence };
  } finally {
    crop.close?.();
  }
}

/*
 * Whole reading of a prepared image: { lines, columns, mode, confidence }.
 *
 *  1. The page is read as before (recognizeLines): single-column pages and the
 *     sheets whose columns are found from the words keep exactly that result.
 *  2. Only when that found no columns, but the pixels show 2–7 side-by-side
 *     panels (dense sheets with drawings), each panel is read on its own and the
 *     title strip above them gives the name. If the panels don't look like days
 *     of exercises, the result of step 1 is kept.
 *
 * onProgress(fraction, stage) — stage: { page: true } | { column, of }.
 */
export async function recognizeImage(bitmap, prepared, onProgress) {
  const page = await recognizeLines(prepared.canvas, (p) => onProgress?.(p, { page: true }));
  const base = { lines: page.lines, columns: page.columns, mode: page.columns > 1 ? 'words' : 'page', confidence: page.confidence };
  if (page.columns > 1) return base;

  let found = null;
  try {
    found = findPixelColumns(grayOf(prepared.canvas), prepared.canvas.width, prepared.canvas.height);
  } catch {
    found = null;
  }
  if (!found) return base;

  const scale = prepared.info?.scale || 1;
  const pad = 2 / scale;
  try {
    const cols = [];
    for (let i = 0; i < found.columns.length; i++) {
      const [x0, x1] = found.columns[i];
      const n = found.columns.length;
      const stage = { column: i + 1, of: n };
      onProgress?.(i / n, stage);
      cols.push(await readCrop(bitmap, x0 / scale - pad, found.top / scale, (x1 - x0) / scale + 2 * pad, (found.bottom - found.top) / scale, (p) => onProgress?.((i + p) / n, stage)));
    }
    const colLines = cols.map((c) => c.lines.filter((l) => l.text.trim()));
    if (!looksLikeDayColumns(colLines)) return base;

    const header = found.top / scale > 20 ? await readCrop(bitmap, 0, 0, bitmap.width, found.top / scale) : { lines: [] };
    const days = inferColumnDays(colLines);
    // Title strip: logos and coloured bands read as noise; keep the lines the OCR trusts a little.
    const lines = header.lines.filter((l) => l.text.trim() && (l.confidence ?? 100) >= 40).map((l) => ({ ...l, zone: 'header' }));
    colLines.forEach((col, i) => {
      lines.push({ text: '', confidence: null });
      lines.push({ text: days[i].label, confidence: 90, synthetic: days[i].synthetic || undefined });
      col.forEach((l, k) => k !== days[i].dayLine && lines.push(l));
    });
    const confidence = Math.round(cols.reduce((s, c) => s + c.confidence, 0) / cols.length);
    return { lines, columns: cols.length, mode: 'pixels', confidence };
  } catch {
    return base; // the first reading is still valid
  }
}

export async function terminateOcr() {
  if (!workerPromise) return;
  const p = workerPromise;
  workerPromise = null;
  try {
    (await p).terminate();
  } catch {
    // already gone
  }
}
