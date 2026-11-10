import { describe, expect, it } from 'vitest';
import { assessReading, describeImportError } from './importErrors';
import { ImageImportError } from './prepareImage';
import { OcrError } from './ocr';

describe('describeImportError', () => {
  it('image problems ask for another image, with tips when the image itself is the issue', () => {
    expect(describeImportError(new ImageImportError('Formato no admitido. Usa JPG, PNG o WEBP.', 'type'))).toMatchObject({ retry: 'other', tips: false, hint: expect.stringMatching(/HEIC/) });
    expect(describeImportError(new ImageImportError('La imagen es demasiado pequeña para leer el texto.', 'too-small'))).toMatchObject({ retry: 'other', tips: true });
    expect(describeImportError(new ImageImportError('No se detectó texto en la imagen.', 'no-text'))).toMatchObject({ retry: 'other', tips: true });
  });

  it('transient problems offer to retry the same image', () => {
    expect(describeImportError(new OcrError('engine'))).toMatchObject({ retry: 'same', message: expect.stringMatching(/lector de texto/) });
    expect(describeImportError(new OcrError('read'))).toMatchObject({ retry: 'same', tips: true });
    expect(describeImportError({ response: { status: 500, data: {} } })).toMatchObject({ retry: 'same', tips: false });
    expect(describeImportError({ request: {}, message: 'Network Error' })).toMatchObject({ retry: 'same', message: expect.stringMatching(/conectar/) });
  });

  it('no exercises found (422) explains the image and allows writing it by hand', () => {
    const e = describeImportError({ response: { status: 422, data: { message: 'No encontramos ejercicios en la imagen.', unparsed: ['x'] } } });
    expect(e).toMatchObject({ message: 'No encontramos ejercicios en la imagen.', tips: true, retry: 'other', canManual: true, unparsed: ['x'] });
  });
});

describe('assessReading', () => {
  it('a good reading has no warning', () => {
    expect(assessReading({ confidence: 88, exercises: 25, matched: 25, imageWidth: 1600, columns: 5 })).toBeNull();
    expect(assessReading({ confidence: 90, exercises: 6, matched: 5, imageWidth: 900, columns: 1 })).toBeNull();
  });

  it('warns when almost nothing was recognised, mentioning low resolution for dense sheets', () => {
    const w = assessReading({ confidence: 68, exercises: 8, matched: 1, imageWidth: 1280, columns: 5 });
    expect(w.message).toMatch(/1 de 8/);
    expect(w.hint).toMatch(/resolución/);
  });

  it('warns that it may not be a routine when nothing matched', () => {
    const w = assessReading({ confidence: 93, exercises: 6, matched: 0, imageWidth: 663, columns: 1 });
    expect(w.message).toMatch(/no sea una rutina/);
    expect(w.hint).not.toMatch(/resolución/); // the letters were read fine: it just isn't a routine
  });

  it('low OCR confidence alone is a warning', () => {
    expect(assessReading({ confidence: 40, exercises: 2, matched: 2, imageWidth: 2000, columns: 1 })).not.toBeNull();
  });
});
