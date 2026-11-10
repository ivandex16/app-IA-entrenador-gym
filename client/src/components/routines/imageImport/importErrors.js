/*
 * What went wrong while importing a routine from an image, said in the user's
 * terms: a message, what to do about it, how the image should look, and which
 * retry makes sense. Pure functions (unit-tested).
 *
 * error shape for the panel:
 *   { message, hint, tips: bool, retry: 'same' | 'other', canManual: bool }
 *     retry 'same'  → transient (connection, server, engine): "Reintentar"
 *     retry 'other' → the image itself: "Elegir otra imagen"
 */
import { ImageImportError } from './prepareImage';
import { OcrError } from './ocr';

/* How an image should be for the import to work (shown with image problems). */
export const IMAGE_TIPS = [
  'Captura de pantalla o foto de frente, recta, con buena luz y sin reflejos ni sombras.',
  'La imagen original en buena resolución (unos 1500 px de ancho o más), no una miniatura ni una imagen reenviada por chat, que llega comprimida.',
  'El texto nítido y con los datos de cada ejercicio: nombre, series y repeticiones (ej. “Press banca 4x10”).',
  'Si la hoja es muy densa (varios días, dibujos, tablas de notas), recorta un día por imagen o haz zoom antes de la captura.',
];

const BY_CODE = {
  type: { hint: 'Si es una foto HEIC del iPhone, haz una captura de pantalla de ella o expórtala como JPG.', tips: false },
  empty: { hint: 'Vuelve a descargar o exportar la imagen y elígela otra vez.', tips: false },
  corrupt: { hint: 'Vuelve a descargar o exportar la imagen y elígela otra vez.', tips: false },
  'too-big': { hint: 'Haz una captura de pantalla de la rutina o reduce la imagen por debajo de 10 MB.', tips: false },
  'too-small': { hint: 'Usa la imagen original, no una miniatura: necesita al menos unos 1000 px de ancho.', tips: true },
  blank: { hint: 'Comprueba que elegiste la imagen correcta y que la rutina se ve con buen contraste.', tips: true },
  'no-text': { hint: 'No pudimos leer letras en la imagen.', tips: true },
};

export function describeImportError(err) {
  if (err instanceof ImageImportError) {
    const c = BY_CODE[err.code] || { hint: null, tips: true };
    return { message: err.message, hint: c.hint, tips: c.tips, retry: 'other', canManual: false };
  }
  if (err instanceof OcrError) {
    return err.kind === 'engine'
      ? { message: 'No se pudo cargar el lector de texto.', hint: 'Revisa tu conexión a internet (la primera vez se descarga) e inténtalo de nuevo.', tips: false, retry: 'same', canManual: true }
      : { message: 'No se pudo leer la imagen en este dispositivo.', hint: 'Puede que la imagen sea demasiado grande para la memoria del dispositivo: prueba con una captura de pantalla de la rutina.', tips: true, retry: 'same', canManual: true };
  }
  const status = err?.response?.status;
  if (status === 422) {
    const data = err.response.data || {};
    return { message: data.message || 'No encontramos ejercicios en la imagen.', hint: 'La imagen no parece una rutina o no se leyó bien.', tips: true, retry: 'other', canManual: true, unparsed: data.unparsed };
  }
  if (err?.response && status >= 500) {
    return { message: 'El servidor tuvo un problema al interpretar la rutina.', hint: 'Tu imagen está bien: espera un momento y vuelve a intentarlo.', tips: false, retry: 'same', canManual: true };
  }
  if (err?.request && !err.response) {
    return { message: 'No se pudo conectar con el servidor.', hint: 'Revisa tu conexión e inténtalo de nuevo.', tips: false, retry: 'same', canManual: true };
  }
  return { message: err?.response?.data?.message || 'No se pudo procesar la imagen.', hint: 'Inténtalo de nuevo; si se repite, prueba con otra imagen.', tips: true, retry: 'same', canManual: true };
}

/*
 * The OCR "worked" but the result is probably poor: warn on the review screen
 * instead of letting the user fix a wrong reading line by line.
 * Returns { message, hint } or null.
 */
export function assessReading({ confidence, exercises, matched, imageWidth, columns }) {
  if (!exercises) return null;
  const ratio = matched / exercises;
  // Resolution is blamed only when the letters themselves were hard to read.
  const lowRes = imageWidth && imageWidth < 1000 * Math.max(1, Math.min(columns || 1, 3) / 2) && (confidence == null || confidence < 80);
  if (exercises >= 3 && matched === 0) {
    return {
      message: 'No reconocimos ningún ejercicio: puede que la imagen no sea una rutina o que no se haya leído bien.',
      hint: lowRes ? 'La imagen tiene poca resolución para la cantidad de texto que contiene.' : 'Comprueba que es la imagen de tu rutina.',
    };
  }
  if ((exercises >= 3 && ratio < 0.4) || (confidence != null && confidence < 55)) {
    return {
      message: `La lectura salió con baja calidad: reconocimos ${matched} de ${exercises} ejercicios.`,
      hint: lowRes ? 'La imagen tiene poca resolución para la cantidad de texto que contiene.' : 'Puedes corregirla aquí, o probar con una imagen más clara.',
    };
  }
  return null;
}
