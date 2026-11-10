import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { LuImageUp, LuX, LuScanText, LuTriangleAlert, LuLoaderCircle, LuCamera, LuInfo, LuRotateCcw } from 'react-icons/lu';
import api from '../../../api/axios';
import ImportReview from './ImportReview';
import { ACCEPT, ImageImportError, loadImage, preprocess } from './prepareImage';
import { recognizeImage, terminateOcr, warmUpOcr } from './ocr';
import { assessReading, describeImportError } from './importErrors';
import ImageTips from './ImageTips';
import { emptyRow, newRowId, stateFromDraft, toRoutinePayload } from './reviewModel';

const STEPS = { validating: 'Comprobando la imagen…', preparing: 'Preparando la imagen…', reading: 'Leyendo el texto…', parsing: 'Interpretando la rutina…' };

/*
 * "Importar rutina desde imagen": pick a photo/screenshot → OCR on the device →
 * the server turns the text into a draft → the user reviews it → only then the
 * routine is created (normal POST /api/routines). Independent from the PDF import.
 */
export default function ImageImportPanel({ onClose, onCreated }) {
  const [phase, setPhase] = useState('pick'); // pick | working | review
  const [step, setStep] = useState('validating');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null); // see describeImportError()
  const [stage, setStage] = useState(null); // { page } | { column, of }
  const [previewUrl, setPreviewUrl] = useState(null);
  const [review, setReview] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);
  const runRef = useRef(0);
  const lastFileRef = useRef(null); // for "Reintentar" after a transient error

  useEffect(() => {
    warmUpOcr(); // start downloading the OCR engine while the user picks a file
    api.get('/exercises').then((r) => setCatalog([...r.data].sort((a, b) => a.name.localeCompare(b.name, 'es')))).catch(() => {});
    return () => {
      runRef.current += 1;
      terminateOcr();
    };
  }, []);
  useEffect(() => () => previewUrl && URL.revokeObjectURL(previewUrl), [previewUrl]);

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    lastFileRef.current = file;
    const run = ++runRef.current;
    const alive = () => runRef.current === run;
    setError(null);
    setReview(null);
    setPhase('working');
    setStep('validating');
    setProgress(0);
    setStage(null);
    let bitmap;
    try {
      const loaded = await loadImage(file);
      bitmap = loaded.bitmap;
      if (!alive()) return;
      setPreviewUrl(URL.createObjectURL(file));
      setStep('preparing');
      const prepared = preprocess(bitmap);
      if (prepared.blank) throw new ImageImportError('La imagen parece vacía o sin texto.', 'blank');
      setStep('reading');
      const ocr = await recognizeImage(bitmap, prepared, (p, st) => {
        if (!alive()) return;
        setProgress(p);
        setStage(st);
      });
      if (!alive()) return;
      if (!ocr.lines.some((l) => l.text.trim().length >= 2)) {
        throw new ImageImportError('No se detectó texto en la imagen.', 'no-text');
      }
      setStep('parsing');
      const lines = ocr.lines.slice(0, 400).map((l) => ({ text: l.text, confidence: l.confidence, ...(l.zone ? { zone: l.zone } : {}) }));
      const { data } = await api.post('/routines/import/image', { lines });
      if (!alive()) return;
      const warning = assessReading({
        confidence: ocr.confidence,
        exercises: data.stats?.exercises,
        matched: data.stats?.matched,
        imageWidth: bitmap.width,
        columns: ocr.columns,
      });
      setReview({ ...stateFromDraft(data), warning });
      setPhase('review');
    } catch (err) {
      if (!alive()) return;
      setPhase('pick');
      setError(describeImportError(err));
    } finally {
      bitmap?.close?.();
      if (inputRef.current) inputRef.current.value = '';
    }
  }, []);

  const startManual = () => {
    setReview({ name: '', nameReview: true, goal: 'general', unparsed: error?.unparsed || [], days: [{ id: newRowId(), label: 'Día 1', exercises: [emptyRow()] }] });
    setError(null);
    setPhase('review');
  };

  const createExercise = useCallback(async (rowId, name, muscleGroup) => {
    const { data } = await api.post('/routines/import/exercises', { name, muscleGroup });
    const ex = data.exercise;
    setCatalog((c) => (c.some((e) => e._id === ex._id) ? c : [...c, ex].sort((a, b) => a.name.localeCompare(b.name, 'es'))));
    setReview((s) => ({
      ...s,
      days: s.days.map((d) => ({
        ...d,
        exercises: d.exercises.map((r) => (r.id === rowId ? { ...r, exerciseId: ex._id, exerciseName: ex.name, review: r.review.filter((f) => f !== 'exercise') } : r)),
      })),
    }));
    toast.success(data.existed ? `Ya existía “${ex.name}”: seleccionado` : `Ejercicio “${ex.name}” creado`);
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.post('/routines', toRoutinePayload(review));
      toast.success('Rutina creada desde la imagen');
      onCreated(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo crear la rutina');
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    if (review && !window.confirm('¿Descartar la rutina detectada? No se guardará nada.')) return false;
    runRef.current += 1;
    setReview(null);
    setPhase('pick');
    setPreviewUrl(null);
    return true;
  };

  const chooseOther = () => inputRef.current?.click();
  const retryOther = () => {
    if (discard()) setTimeout(chooseOther, 50);
  };

  return (
    <div className="animate-slideUp bg-[#0E1018]/95 backdrop-blur-xl border border-white/[0.1] p-4 sm:p-8 rounded-3xl space-y-5 shadow-2xl shadow-black/80">
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 shrink-0 rounded-xl bg-lime-400/10 border border-lime-400/25 flex items-center justify-center text-lime-400">
            <LuImageUp className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="font-black text-lg text-white uppercase tracking-tight">
              {phase === 'review' ? 'Revisar rutina importada' : 'Importar rutina desde imagen'}
            </h2>
            <p className="text-xs text-zinc-400 font-medium">
              {phase === 'review' ? 'Corrige lo que haga falta antes de crearla' : 'Foto o captura de tu rutina: la leemos en tu dispositivo'}
            </p>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar" className="w-8 h-8 shrink-0 rounded-lg bg-white/[0.05] hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white">
          <LuX className="w-4 h-4" />
        </button>
      </div>

      {phase === 'review' && review ? (
        <ImportReview
          state={review}
          setState={setReview}
          catalog={catalog}
          previewUrl={previewUrl}
          saving={saving}
          onCreateExercise={createExercise}
          onSave={save}
          onCancel={discard}
          onRetry={retryOther}
        />
      ) : (
        <>
          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (phase !== 'working') handleFile(e.dataTransfer.files?.[0]);
            }}
            className={`block rounded-2xl border-2 border-dashed p-6 sm:p-8 text-center transition ${
              phase === 'working' ? 'border-lime-400/30 bg-lime-400/[0.03] cursor-wait' : 'border-white/15 hover:border-lime-400/50 cursor-pointer'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="sr-only"
              disabled={phase === 'working'}
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            {phase === 'working' ? (
              <div className="space-y-3" aria-live="polite">
                <LuLoaderCircle className="w-8 h-8 text-lime-400 mx-auto animate-spin" aria-hidden="true" />
                <p className="text-sm font-bold text-white">
                  {step === 'reading' && stage?.column ? `Leyendo la columna ${stage.column} de ${stage.of}…` : STEPS[step]}
                </p>
                {step === 'reading' && (
                  <div className="max-w-xs mx-auto h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                    <div className="h-full bg-lime-400 transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
                  </div>
                )}
                <p className="text-[11px] text-zinc-500">La primera vez se descarga el lector de texto (unos segundos).</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 text-lime-400">
                  <LuScanText className="w-8 h-8" aria-hidden="true" />
                  <LuCamera className="w-6 h-6 sm:hidden" aria-hidden="true" />
                </div>
                <p className="text-sm font-bold text-white">Elige una imagen o arrástrala aquí</p>
                <p className="text-xs text-zinc-400">JPG, PNG o WEBP · hasta 10 MB</p>
              </div>
            )}
          </label>

          {error && (
            <div role="alert" className="rounded-xl border border-rose-500/25 bg-rose-500/5 p-3 sm:p-4 space-y-2.5">
              <p className="text-sm font-semibold text-rose-200 flex items-start gap-2"><LuTriangleAlert className="w-4 h-4 mt-0.5 shrink-0" /> {error.message}</p>
              {error.hint && <p className="text-xs text-zinc-300">{error.hint}</p>}
              {error.tips && <ImageTips open />}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {error.retry === 'same' && lastFileRef.current && (
                  <button type="button" onClick={() => handleFile(lastFileRef.current)} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-lime-400 hover:bg-lime-300 text-zinc-950 text-xs font-black">
                    <LuRotateCcw className="w-4 h-4" /> Reintentar
                  </button>
                )}
                <button
                  type="button"
                  onClick={chooseOther}
                  className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-black ${error.retry === 'same' ? 'border border-white/15 text-zinc-200 hover:text-white' : 'bg-lime-400 hover:bg-lime-300 text-zinc-950'}`}
                >
                  <LuImageUp className="w-4 h-4" /> {error.retry === 'same' ? 'Elegir otra imagen' : 'Intentar con otra imagen'}
                </button>
                {error.canManual && (
                  <button type="button" onClick={startManual} className="text-xs font-bold text-lime-300 hover:text-lime-200 px-1">
                    Escribirla a mano
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-white/[0.06] bg-[#131622] p-4 space-y-2 text-xs text-zinc-300">
            <p className="font-bold text-lime-300 flex items-center gap-1.5"><LuInfo className="w-4 h-4" /> Funciona mejor con</p>
            <ul className="list-disc pl-5 space-y-0.5 text-zinc-400">
              <li>Capturas de pantalla, rutinas impresas o tablas, en español o inglés.</li>
              <li>Fotos de frente, con buena luz y el texto enfocado.</li>
              <li>Formatos como “Press banca 4x10”, “Sentadilla 3 x 8 100 kg”, “Descanso 90 s”, “RIR 2”.</li>
            </ul>
            <p className="text-zinc-500">La letra escrita a mano normalmente no se reconoce bien: podrás corregirla en la revisión.</p>
          </div>
        </>
      )}
    </div>
  );
}
