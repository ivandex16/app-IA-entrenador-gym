/*
 * Image checks and light preprocessing before OCR, all in the browser.
 *
 * - Type is checked by its real signature (magic bytes), not only the
 *   extension or the browser-reported MIME.
 * - Decoding with createImageBitmap rejects corrupt files and applies the
 *   phone's EXIF rotation.
 * - Only changes that help Tesseract are applied: resize to a readable scale,
 *   grayscale and a contrast stretch (dark / washed-out photos). Binarization
 *   and deskew are left to Tesseract itself (Otsu + rotateAuto).
 */

export const MAX_BYTES = 10 * 1024 * 1024;
export const ACCEPT = 'image/jpeg,image/png,image/webp';
const EXTENSIONS = /\.(jpe?g|png|webp)$/i;

/* code: type | empty | too-big | corrupt | too-small | blank | no-text */
export class ImageImportError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

async function sniffType(file) {
  const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return 'image/png';
  const ascii = String.fromCharCode(...b);
  if (ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP') return 'image/webp';
  return null;
}

/* Validates the file and returns a decoded, correctly oriented bitmap. */
export async function loadImage(file) {
  if (!file) throw new ImageImportError('Selecciona una imagen.', 'empty');
  if (!EXTENSIONS.test(file.name || '')) throw new ImageImportError('Formato no admitido. Usa JPG, PNG o WEBP.', 'type');
  if (file.size === 0) throw new ImageImportError('El archivo está vacío.', 'empty');
  if (file.size > MAX_BYTES) throw new ImageImportError('La imagen supera 10 MB.', 'too-big');
  const type = await sniffType(file);
  if (!type) throw new ImageImportError('El archivo no es una imagen JPG, PNG o WEBP válida.', 'type');
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new ImageImportError('No se pudo abrir la imagen: el archivo parece dañado.', 'corrupt');
  }
  if (bitmap.width < 200 || bitmap.height < 100) {
    bitmap.close?.();
    throw new ImageImportError('La imagen es demasiado pequeña para leer el texto.', 'too-small');
  }
  return { bitmap, type };
}

/*
 * Grayscale + contrast stretch at a scale where text is ~20–40 px tall.
 * Returns { canvas, blank } — blank when the image has almost no contrast
 * (empty page, lens covered…), so we don't run OCR on nothing.
 */
export function preprocess(bitmap, { targetLong = 3000 } = {}) {
  const longSide = Math.max(bitmap.width, bitmap.height);
  // Enlarged up to ~3000px (×2 max): dense sheets have ~10px text and small coloured
  // numbers that Tesseract misreads below ~20px. Huge photos are reduced.
  const scale = Math.min(2, targetLong / longSide);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, w, h);

  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const hist = new Uint32Array(256);
  for (let i = 0; i < d.length; i += 4) {
    const y = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    d[i] = y;
    hist[y] += 1;
  }
  // 1st and 99th percentiles → stretch to 0..255 (dark or washed-out photos).
  const total = w * h;
  let lo = 0;
  let hi = 255;
  for (let acc = 0; lo < 255 && (acc += hist[lo]) < total * 0.01; lo++);
  for (let acc = 0; hi > 0 && (acc += hist[hi]) < total * 0.01; hi--);
  let mean = 0;
  for (let v = 0; v < 256; v++) mean += v * hist[v];
  mean /= total;
  let variance = 0;
  for (let v = 0; v < 256; v++) variance += hist[v] * (v - mean) ** 2;
  const std = Math.sqrt(variance / total);
  const blank = std < 6 || hi - lo < 20;

  const range = Math.max(1, hi - lo);
  const gray = new Uint8ClampedArray(w * h);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) gray[p] = ((d[i] - lo) * 255) / range;

  // Light text on dark areas (dark-mode screenshots, coloured header bands) is
  // inverted locally so every text ends up dark on light. Dark areas are found on
  // a coarse grid of cells; the cells around them only flip their dark pixels, so
  // the band leaves no black frame (Tesseract would take a framed box for a picture).
  const c = Math.max(8, Math.round(Math.max(w, h) / 300)); // cell ≈ 10px at 3000px
  const cw = Math.ceil(w / c);
  const ch = Math.ceil(h / c);
  const cellSum = new Float64Array(cw * ch);
  const cellN = new Uint32Array(cw * ch);
  for (let y = 0; y < h; y++) {
    const cy = Math.floor(y / c) * cw;
    for (let x = 0; x < w; x++) {
      const k = cy + Math.floor(x / c);
      cellSum[k] += gray[y * w + x];
      cellN[k] += 1;
    }
  }
  // A cell is dark when it and its 8 neighbours average under 100 (text inside a band stays "dark").
  const cellMean = new Float64Array(cw * ch);
  for (let k = 0; k < cw * ch; k++) cellMean[k] = cellSum[k] / Math.max(1, cellN[k]);
  const around = (cx, cy, rad) => {
    let s = 0;
    let n = 0;
    for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
      const yy = cy + dy;
      const xx = cx + dx;
      if (yy >= 0 && yy < ch && xx >= 0 && xx < cw) { s += cellMean[yy * cw + xx]; n++; }
    }
    return s / n;
  };
  const core = new Uint8Array(cw * ch);
  for (let cy = 0; cy < ch; cy++) {
    for (let cx = 0; cx < cw; cx++) {
      const own = cellMean[cy * cw + cx];
      // Dark area, or a cell with light letters inside a dark area (its own mean is mid-gray).
      core[cy * cw + cx] = around(cx, cy, 1) < 100 || (own < 160 && around(cx, cy, 2) < 115) ? 1 : 0;
    }
  }
  const rim = new Uint8Array(cw * ch);
  for (let cy = 0; cy < ch; cy++) {
    for (let cx = 0; cx < cw; cx++) {
      if (core[cy * cw + cx]) continue;
      for (let dy = -1; dy <= 1 && !rim[cy * cw + cx]; dy++) for (let dx = -1; dx <= 1; dx++) {
        const yy = cy + dy;
        const xx = cx + dx;
        if (yy >= 0 && yy < ch && xx >= 0 && xx < cw && core[yy * cw + xx]) { rim[cy * cw + cx] = 1; break; }
      }
    }
  }
  let invertedPx = 0;
  for (let y = 0; y < h; y++) {
    const cy = Math.floor(y / c) * cw;
    for (let x = 0; x < w; x++) {
      const k = cy + Math.floor(x / c);
      let v = gray[y * w + x];
      if (core[k] || (rim[k] && v < 128)) {
        v = 255 - v;
        invertedPx++;
      }
      const i = (y * w + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = v;
    }
  }
  ctx.putImageData(img, 0, 0);
  return { canvas, blank, info: { width: w, height: h, scale, inverted: Math.round((100 * invertedPx) / (w * h)) } };
}
