/*
 * OCR in the browser with Tesseract (tesseract.js): free, no API key, and the
 * image never leaves the device. The library (~a few MB of WebAssembly + the
 * Spanish/English language data) is loaded only when the user opens the image
 * import, then cached by the browser.
 */
import { analyzeLayout, withDayBand } from './layout';

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
    const worker = await getWorker();
    const { data } = await worker.recognize(image, { rotateAuto: true }, { text: true, blocks: true });
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
