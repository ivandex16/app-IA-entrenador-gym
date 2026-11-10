/*
 * Deterministic parser: OCR lines → routine draft (no AI).
 *
 * Input:  [{ text, confidence? }] — one entry per OCR line (confidence 0–100).
 * Output: { name, days: [{ label, exercises: [draft] }], unparsed: [text] }
 *
 * Each draft field is { value, confidence: 'high' | 'medium' | 'low' } or null
 * when the image doesn't say it. Nothing is guessed: a missing rest, weight,
 * RIR… stays null for the user to fill in.
 *
 * Recognised (Spanish and English, any spacing / x × X *):
 *   "Press banca 4x10"  "Bench Press - 4 x 10"  "Squat 3x8 100kg"
 *   "Curl 3x10-12 RIR 2"  "4 series de 10"  "10 reps x 4 sets"
 *   name line followed by "4 series" / "10 reps" / "90 sec rest" lines
 *   tables: a header row (Ejercicio | Series | Reps | Peso…) then rows
 *   day headers (Lunes - Pecho, Día 2, Push, Upper…), "Nombre: …",
 *   supersets (A1/A2, "Superserie"), RIR, RPE, tempo, notes.
 */
const { normKey, normalizeLine, stripListMarker, signalRatio, tidyName } = require('./textUtils');

const LEVELS = ['low', 'medium', 'high'];
const lower = (c, steps = 1) => LEVELS[Math.max(0, LEVELS.indexOf(c) - steps)];
const field = (value, confidence = 'high', extra = {}) => ({ value, confidence, ...extra });
const num = (s) => Number(String(s).replace(',', '.'));

/* ── Headers ── */
const WEEKDAY = '(?:lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo|monday|tuesday|wednesday|thursday|friday|saturday|sunday)';
const DAY_RE = new RegExp(`^(?:${WEEKDAY}|(?:d[ií]a|day|sesi[oó]n|session|entreno|entrenamiento|workout|rutina)\\s*[0-9A-Da-d]\\b)`, 'i');
const GROUP_WORDS = new Set(
  ('pecho espalda hombro hombros biceps triceps pierna piernas gluteo gluteos abdomen abdominales core cardio push pull legs leg ' +
   'upper lower torso chest back shoulders shoulder arms arm brazos brazo full body cuerpo completo cuadriceps femoral femorales ' +
   'isquios isquiotibiales gemelos pantorrillas calves glutes abs day dia tren superior inferior y and e con with')
    .split(' ')
);
const CONNECTORS = new Set(['y', 'and', 'e', 'con', 'with', 'day', 'dia']);

function isGroupHeader(text) {
  if (/\d/.test(text)) return false;
  const words = normKey(text).split(' ').filter(Boolean);
  return words.length > 0 && words.length <= 6 && words.every((w) => GROUP_WORDS.has(w)) && words.some((w) => !CONNECTORS.has(w));
}

const COLUMN_KEYS = [
  ['name', /^(ejercicios?|exercises?|movimientos?|nombre|name)$/],
  ['sets', /^(series|serie|sets?|rondas|rounds)$/],
  ['reps', /^(reps?|repeticiones|repetitions|repeticion)$/],
  ['weight', /^(peso|weight|carga|load|kg|kgs|lbs?)$/],
  ['rest', /^(descanso|rest|desc|pausa|recuperacion|recovery)$/],
  ['rir', /^rir$/],
  ['rpe', /^rpe$/],
  ['tempo', /^(tempo|cadencia)$/],
  ['notes', /^(notas?|notes?|observaciones|obs|comentarios|comments)$/],
];

/* "Ejercicio | Series | Reps | Peso" → ['name','sets','reps','weight'] (or null). */
function detectTableHeader(text) {
  if (/\d/.test(text)) return null;
  const tokens = normKey(text.replace(/\|/g, ' ')).split(' ').filter(Boolean);
  const cols = [];
  let unknown = 0;
  for (const t of tokens) {
    const hit = COLUMN_KEYS.find(([, re]) => re.test(t));
    if (hit && !cols.includes(hit[0])) cols.push(hit[0]);
    else if (!hit) unknown += 1;
  }
  const useful = cols.filter((c) => c !== 'name');
  return useful.length >= 2 && unknown <= 2 && (cols.includes('sets') || cols.includes('reps')) ? cols : null;
}

/* ── Field extraction ──
   Matches are blanked with spaces (same length) so positions stay valid and
   the exercise name is what comes before the first recognised value. */
function takeFirst(state, re, build) {
  const m = re.exec(state.text);
  if (!m) return null;
  const value = build(m);
  if (value === undefined) return null;
  state.text = state.text.slice(0, m.index) + ' '.repeat(m[0].length) + state.text.slice(m.index + m[0].length);
  state.first = Math.min(state.first, m.index);
  return value;
}

// Rest keyword; "nso:" / "anso:" is "Descanso:" with its start lost by the OCR.
const REST_WORD = 'descanso|desc\\.?|rest|pausa|recuperaci[oó]n|recovery|[a-z]{0,5}nso(?=\\s*:)';
const SEC_UNIT ='(?:segundos|seconds|segs?|secs?|s|")';
const MIN_UNIT = "(?:minutos|minutes|mins?|m|')";
const restSeconds = (v, unit, { keyword }) => {
  if (v.includes(':')) {
    const [m, s] = v.split(':').map(Number);
    return field(m * 60 + s, 'high');
  }
  const n = num(v);
  if (unit && new RegExp(`^${MIN_UNIT}$`, 'i').test(unit)) return field(Math.round(n * 60), keyword ? 'high' : 'medium');
  if (unit) return field(Math.round(n), keyword ? 'high' : 'medium');
  // "Descanso 2" with no unit: small numbers are almost always minutes, but say so.
  return n <= 5 ? field(Math.round(n * 60), 'low') : field(Math.round(n), 'medium');
};

function extractFields(text) {
  const state = { text, first: Infinity };
  const out = { notes: [] };

  out.tempo = takeFirst(state, /\b(?:tempo|cadencia)\s*[:\-]?\s*([0-9xX](?:\s*[-\/.]?\s*[0-9xX]){2,3})\b/i, (m) =>
    field(m[1].replace(/[^0-9xX]/g, '').toUpperCase().split('').join('-'), 'high'));
  out.rir = takeFirst(state, /@?\s*\brir\s*[:\-]?\s*(\d)(?:\s*[-a]\s*(\d))?/i, (m) => field(m[2] ? `${m[1]}-${m[2]}` : m[1], 'high'));
  out.rpe = takeFirst(state, /@?\s*\brpe\s*[:\-@]?\s*(\d{1,2}(?:[.,]5)?)(?:\s*-\s*(\d{1,2}(?:[.,]5)?))?/i, (m) =>
    field(m[2] ? `${m[1]}-${m[2]}`.replace(',', '.') : m[1].replace(',', '.'), num(m[1]) <= 10 ? 'high' : 'low'));

  // Weight: "100kg", "@ 80 kg", "45 lb", "Peso: 80". A range "60-70 kg" is kept as a note.
  const range = takeFirst(state, /(\d{1,3}(?:[.,]\d{1,2})?)\s*[-\/]\s*(\d{1,3}(?:[.,]\d{1,2})?)\s*(kg|kgs|kilos?|lbs?|libras?)\b/i, (m) => m[0]);
  if (range) out.notes.push(`Peso: ${range.trim()}`);
  out.weight = takeFirst(state, /@?\s*(\d{1,3}(?:[.,]\d{1,2})?)\s*(kg|kgs|kilos?|lbs?|libras?)\b/i, (m) => {
    const v = num(m[1]);
    if (/^l/i.test(m[2])) return field(Math.round((v * 0.4536) * 2) / 2, 'medium', { text: `${m[1]} ${m[2]}` });
    return field(v, 'high', { text: `${m[1]} kg` });
  }) || takeFirst(state, /\b(?:peso|weight|carga|load)\s*[:\-]?\s*(\d{1,3}(?:[.,]\d{1,2})?)\b(?!\s*x)/i, (m) => field(num(m[1]), 'medium'));
  if (!out.weight && /\b(peso corporal|bodyweight|bw)\b/i.test(state.text)) out.notes.push('Peso corporal');

  // Rest range "Descanso: 150-180 s" (OCR also reads the dash as "." or ":"): the lower
  // bound is used and the full range kept in the notes. "1:30" stays a time.
  out.restSeconds = takeFirst(state, new RegExp(`\\b(?:${REST_WORD})\\s*[:\\-]?\\s*(\\d{1,3})\\s*([-–.:\\/])\\s*(\\d{1,3})\\s*(${SEC_UNIT}|${MIN_UNIT})?(?![a-z0-9])`, 'i'),
    (m) => {
      const a = Number(m[1]);
      const b = Number(m[3]);
      if (m[2] === ':' && a <= 15 && b < 60) return undefined; // "1:30" → handled below as a time
      if (m[2] === '.' && m[4] && new RegExp(`^${MIN_UNIT}$`, 'i').test(m[4])) return undefined; // "1.5 min"
      if (!(b > a)) return undefined;
      const toSec = (n) => (m[4] && new RegExp(`^${MIN_UNIT}$`, 'i').test(m[4]) ? n * 60 : n);
      out.notes.push(`Descanso ${a}-${b} ${m[4] && new RegExp(`^${MIN_UNIT}$`, 'i').test(m[4]) ? 'min' : 's'}`);
      return field(toSec(a), m[2] === '-' || m[2] === '–' ? 'medium' : 'low');
    });
  // Rest: keyword before or after the value, "@90s", or a value with a time unit.
  out.restSeconds = out.restSeconds ||
    takeFirst(state, new RegExp(`\\b(?:${REST_WORD})\\s*[:\\-]?\\s*(\\d{1,2}:\\d{2}|\\d{1,3}(?:[.,]\\d)?)\\s*(${SEC_UNIT}|${MIN_UNIT})?(?![a-z])`, 'i'),
      (m) => restSeconds(m[1], m[2], { keyword: true })) ||
    takeFirst(state, new RegExp(`(\\d{1,2}:\\d{2}|\\d{1,3}(?:[.,]\\d)?)\\s*(${SEC_UNIT}|${MIN_UNIT})\\s*(?:de\\s+)?(?:descanso|rest|desc|pausa)\\b`, 'i'),
      (m) => restSeconds(m[1], m[2], { keyword: true })) ||
    takeFirst(state, new RegExp(`@\\s*(\\d{1,3})\\s*(${SEC_UNIT})?(?![a-z0-9])`, 'i'), (m) => restSeconds(m[1], m[2] || 's', { keyword: true })) ||
    takeFirst(state, new RegExp(`(?<![x\\d.,-])(\\d{1,3}(?:[.,]\\d)?)\\s*(segundos|seconds|segs?|secs?|s|min(?:utos|utes|s)?|'|")(?![a-z0-9])`, 'i'),
      (m) => restSeconds(m[1], m[2], { keyword: false }));

  // Sets × reps, in every common wording.
  const setsReps =
    takeFirst(state, /(\d{1,2})x(\d{1,4})(?:\s*(?:-|a|to|\/)\s*(\d{1,3}))?(?:\s*(?:reps?|repeticiones|repetitions))?/i,
      (m) => ({ sets: m[1], min: m[2], max: m[3] })) ||
    takeFirst(state, /(\d{1,2})\s*(?:series|sets?|serie|rondas|rounds)\s*(?:de|of|x|por|:)?\s*(\d{1,3})(?:\s*(?:-|a|to)\s*(\d{1,3}))?\s*(?:reps?|repeticiones|repetitions)?/i,
      (m) => ({ sets: m[1], min: m[2], max: m[3] })) ||
    takeFirst(state, /(\d{1,3})(?:\s*(?:-|a|to)\s*(\d{1,3}))?\s*(?:reps?|repeticiones|repetitions)\s*(?:x|por|en)\s*(\d{1,2})\s*(?:series|sets?)/i,
      (m) => ({ sets: m[3], min: m[1], max: m[2] }));
  if (setsReps) {
    out.sets = field(Number(setsReps.sets));
    out.reps = field({ min: Number(setsReps.min), max: Number(setsReps.max || setsReps.min) });
    // OCR sometimes drops the dash of a range: "3x1215" / "3x68". Implausible rep counts
    // that read as two ascending numbers are split, but always marked for review.
    const { min, max } = out.reps.value;
    if (min === max && min > 50) {
      const s = String(min);
      const half = s.length === 4 ? [s.slice(0, 2), s.slice(2)] : s.length === 2 ? [s[0], s[1]] : s.length === 3 ? [s[0], s.slice(1)] : null;
      if (half && Number(half[0]) >= 1 && Number(half[0]) < Number(half[1]) && Number(half[1]) <= 30) {
        out.reps = field({ min: Number(half[0]), max: Number(half[1]) }, 'low');
      }
    }
  } else {
    const sets = takeFirst(state, /(\d{1,2})\s*(?:series|sets?|serie|rondas|rounds)\b/i, (m) => Number(m[1]));
    if (sets != null) out.sets = field(sets);
    const reps = takeFirst(state, /(\d{1,3})(?:\s*(?:-|a|to)\s*(\d{1,3}))?\s*(?:reps?|repeticiones|repetitions)\b/i,
      (m) => ({ min: Number(m[1]), max: Number(m[2] || m[1]) }));
    if (reps) out.reps = field(reps);
  }
  // "/lado", "por lado", "each side" (OCR: "flado", "llado").
  const perSide = takeFirst(state, /(?:[\/fl1|]\s*lado|\b(?:por|cada)\s+(?:lado|pierna|brazo)|\bper\s+side|\beach\s+(?:side|leg|arm))\b/i, (m) => m[0]);
  if (perSide) out.notes.push('Por lado');
  const failure = takeFirst(state, /\b(al fallo|hasta el fallo|fallo|amrap|to failure|failure)\b/i, (m) => m[1]);
  if (failure) out.notes.push(failure.toLowerCase().includes('amrap') ? 'AMRAP' : 'Al fallo');

  // Parenthesised text is a note: "Press banca 4x10 (agarre cerrado)".
  const paren = takeFirst(state, /\(([^)]{2,80})\)/, (m) => m[1].trim());
  if (paren) out.notes.push(paren);

  out.remaining = state.text;
  out.first = state.first;
  return out;
}

const hasAnyField = (f) => Boolean(f.sets || f.reps || f.weight || f.restSeconds || f.rir || f.rpe || f.tempo);

/* Name = text before the first recognised value, without separators. */
function cleanName(s) {
  return s.replace(/[|:;,_=]+/g, ' ').replace(/\s[-–]\s*$/, ' ').replace(/^\s*[-–]\s*/, '').replace(/\s+/g, ' ').trim().replace(/[-–.]+$/, '').trim();
}
const looksLikeName = (s) => (s.match(/[A-Za-zÁÉÍÓÚÑáéíóúñü]/g) || []).length >= 3 && s.length <= 70 && s.split(' ').length <= 9;

/* Plausible ranges: values outside them are flagged, never silently changed. */
function checkRanges(ex) {
  if (ex.sets && (ex.sets.value < 1 || ex.sets.value > 10)) ex.sets.confidence = 'low';
  if (ex.reps) {
    const { min, max } = ex.reps.value;
    if (min < 1 || max > 100 || min > max) ex.reps.confidence = 'low';
  }
  if (ex.weight && (ex.weight.value <= 0 || ex.weight.value > 500)) ex.weight.confidence = 'low';
  if (ex.restSeconds && (ex.restSeconds.value < 5 || ex.restSeconds.value > 900)) ex.restSeconds.confidence = 'low';
}

const NUMERIC_FIELDS = ['sets', 'reps', 'weight', 'restSeconds', 'rir', 'rpe', 'tempo'];

/* Parse a table row by column order: "Press | 4 | 10 | 80kg" or "Press banca 4 10 80kg". */
function parseTableRow(text, columns) {
  let cells;
  let confidence = 'medium';
  const piped = text.split('|').map((c) => c.trim()).filter(Boolean);
  if (piped.length >= 2) {
    // OCR sometimes merges two narrow columns into one cell ("10-12 -"): split value
    // cells on spaces too, keeping "80 kg" / "90 s" together.
    const values = piped.slice(1).join(' ').replace(/(\d)\s+(kg|kgs|lbs?|s|seg|sec|min)\b/gi, '$1$2').split(/\s+/);
    cells = [piped[0], ...values];
    confidence = values.length === piped.length - 1 ? 'high' : 'medium';
  } else {
    const m = /^(.*?[A-Za-zÁÉÍÓÚÑáéíóúñü][^\d]*?)\s+(?=\d)(.*)$/.exec(text);
    if (!m) return null;
    const values = m[2].replace(/(\d)\s+(kg|kgs|lbs?|s|seg|sec|min)\b/gi, '$1$2').split(/\s+/);
    cells = [m[1], ...values];
  }
  const nameIdx = columns.indexOf('name');
  const ex = { name: nameIdx >= 0 ? cells[nameIdx] ?? cells[0] : cells[0], notes: [] };
  const valueCols = columns.filter((c) => c !== 'name');
  const values = nameIdx >= 0 ? cells.filter((_, i) => i !== nameIdx) : cells.slice(1);
  valueCols.forEach((col, i) => {
    // A notes column takes the rest of the row (several words).
    const v = (col === 'notes' ? values.slice(i).join(' ') : values[i] || '').trim();
    if (!v || /^[-–—]+$/.test(v)) return;
    if (col === 'sets' && /^\d{1,2}$/.test(v)) ex.sets = field(Number(v), confidence);
    else if (col === 'reps') {
      const r = /^(\d{1,3})(?:\s*(?:-|a|to|\/)\s*(\d{1,3}))?$/.exec(v);
      if (r) ex.reps = field({ min: Number(r[1]), max: Number(r[2] || r[1]) }, confidence);
      else if (/fallo|amrap|failure/i.test(v)) ex.notes.push('Al fallo');
    } else if (col === 'weight') {
      const w = /^(\d{1,3}(?:[.,]\d{1,2})?)\s*(kg|kgs|lbs?)?$/i.exec(v);
      if (w) ex.weight = /^l/i.test(w[2] || '') ? field(Math.round(num(w[1]) * 0.4536 * 2) / 2, 'medium') : field(num(w[1]), confidence);
      else if (/corporal|bw|bodyweight/i.test(v)) ex.notes.push('Peso corporal');
    } else if (col === 'rest') {
      const r = new RegExp(`^(\\d{1,2}:\\d{2}|\\d{1,3}(?:[.,]\\d)?)\\s*(${SEC_UNIT}|${MIN_UNIT})?$`, 'i').exec(v);
      if (r) ex.restSeconds = restSeconds(r[1], r[2], { keyword: true });
    } else if (col === 'rir' && /^\d(-\d)?$/.test(v)) ex.rir = field(v, confidence);
    else if (col === 'rpe' && /^\d{1,2}([.,]5)?$/.test(v)) ex.rpe = field(v.replace(',', '.'), confidence);
    else if (col === 'tempo') ex.tempo = field(v, confidence);
    else if (col === 'notes') ex.notes.push(v);
  });
  return ex;
}

/* Words that describe a day's focus ("Piernas A + abdomen", "Tren superior B · Volumen y control"). */
const DESCRIPTOR_WORDS = new Set(
  ('volumen control fuerza hipertrofia resistencia potencia tecnica equilibrio sobrecarga unilateral bilateral ' +
   'intensidad descarga movilidad accesorios accesorio basico basicos compuesto compuestos foco enfasis ' +
   'empuje traccion tiron dominante dominantes cadera rodilla volume strength power hypertrophy focus')
    .split(' ')
);
function isSubtitle(text) {
  if (/\d/.test(text)) return false;
  const words = normKey(text).split(' ').filter((w) => w && !CONNECTORS.has(w) && w.length > 1);
  if (!words.length || words.length > 6) return false;
  const known = words.filter((w) => GROUP_WORDS.has(w) || DESCRIPTOR_WORDS.has(w)).length;
  return known / words.length >= 0.5;
}

/* Section titles whose text is advice, not exercises ("NOTAS DEL DÍA", "Calentamiento"). */
const NOTES_HEADING = /^(notas?(\s+del?\s+d[ií]a)?|notes?|observaciones|consejos|tips|indicaciones|recomendaciones|importante|calentamiento|enfriamiento|warm[\s-]?up|cool[\s-]?down)\s*:?$/i;
const STRONG_EXERCISE = /\d\s*x\s*\d|\b\d{1,2}\s*(series|serie|sets?|rondas|rounds)\b/i;
const wordCount = (t) => t.split(/\s+/).filter((w) => /[A-Za-zÁÉÍÓÚÑáéíóúñ0-9]/.test(w)).length;
/* A sentence of advice ("Codos hacia costados; sin tirones.") rather than a name. */
const isProse = (t) => wordCount(t) >= 7 || /[.;]\s*$/.test(t) || /;/.test(t) || (wordCount(t) >= 4 && /:\s+[a-záéíóúñ]/.test(t));
const isAllCaps = (t) => /[A-ZÁÉÍÓÚÑ]/.test(t) && t === t.toUpperCase();

function parseRoutineText(input) {
  const lines = (Array.isArray(input) ? input : String(input || '').split(/\r?\n/).map((text) => ({ text })))
    .map((l) => ({ text: String(l.text || ''), ocr: Number.isFinite(l.confidence) ? l.confidence : null, zone: l.zone || null }));

  // Sheets organised by day names: text before the first day is title / description.
  const firstDayIdx = lines.findIndex((l) => {
    const t = stripListMarker(normalizeLine(l.text).text).text;
    return l.zone == null && DAY_RE.test(t) && !STRONG_EXERCISE.test(t);
  });
  const hasDayNames = firstDayIdx >= 0 && lines.slice(firstDayIdx).filter((l) => DAY_RE.test(l.text.trim())).length >= 1;

  let name = null;
  const days = [];
  const unparsed = [];
  let day = null;
  let columns = null;
  let last = null; // exercise that detail lines attach to
  let supersetLetter = null;
  let supersetCount = 0;
  let seenExercise = false;
  let notesMode = false; // inside "NOTAS DEL DÍA"-like sections: text is advice, not exercises

  const currentDay = () => {
    if (!day) {
      day = { label: null, exercises: [], subtitles: 0 };
      days.push(day);
    }
    return day;
  };

  const addExercise = (detectedName, fields, meta) => {
    const ex = {
      detectedName: tidyName(detectedName, { keepTrailingConnectors: !hasAnyField(fields) }),
      nameConfidence: meta.nameConfidence,
      sourceText: [meta.raw],
      superset: meta.superset || supersetLetter || null,
      notes: [...(fields.notes || [])],
      nameOnly: !hasAnyField(fields),
    };
    for (const k of NUMERIC_FIELDS) ex[k] = fields[k] || null;
    currentDay().exercises.push(ex);
    last = ex;
    seenExercise = seenExercise || hasAnyField(fields); // a bare name line may still precede the title
    return ex;
  };
  const nextText = (i) => {
    for (let j = i + 1; j < lines.length; j++) {
      const t = lines[j].text.trim();
      if (t) return normalizeLine(t).text;
    }
    return '';
  };
  const takeTitle = (text, conf) => {
    if (!name && /[A-Za-zÁÉÍÓÚÑáéíóúñ]{3,}/.test(text)) {
      name = { value: text.replace(/[:\-–\s]+$/, '').trim(), confidence: conf };
      return true;
    }
    return false;
  };

  for (let i = 0; i < lines.length; i++) {
    const { text: raw, ocr, zone } = lines[i];
    const { text: normalized, fixed } = normalizeLine(raw);
    if (!normalized) {
      supersetLetter = null; // a blank line ends a superset block
      continue;
    }
    if (signalRatio(normalized) < 0.6 || normalized.replace(/[^A-Za-z0-9]/g, '').length < 2) {
      if (normalized.replace(/\s/g, '').length > 2) unparsed.push(raw.trim());
      continue;
    }
    // Confidence of what this line produced: OCR certainty and repaired digits lower it.
    let lineConf = 'high';
    if (ocr != null && ocr < 80) lineConf = 'medium';
    if (ocr != null && ocr < 55) lineConf = 'low';
    const numConf = fixed ? 'low' : lineConf;
    const soften = (f) => {
      if (f && LEVELS.indexOf(f.confidence) > LEVELS.indexOf(numConf)) f.confidence = numConf;
      return f;
    };

    // Page title / footnotes found by the layout step.
    if (zone === 'header') {
      if (!takeTitle(normalized, lineConf)) unparsed.push(raw.trim());
      continue;
    }
    if (zone === 'footer') {
      unparsed.push(raw.trim());
      continue;
    }

    const titled = /^(nombre|rutina|routine|programa|plan|name)\s*[:\-]\s*(.+)$/i.exec(normalized);
    if (titled && !/\d+\s*x\s*\d/.test(titled[2])) {
      if (!name) name = { value: titled[2].trim(), confidence: lineConf };
      continue;
    }

    // Before the first day name: title, then description lines.
    if (hasDayNames && i < firstDayIdx && !STRONG_EXERCISE.test(normalized)) {
      if (!takeTitle(normalized, lineConf)) unparsed.push(raw.trim());
      continue;
    }

    const { text, superset } = stripListMarker(normalized);
    const hasDigits = /\d/.test(text);

    if (/^(superseries?|super ?sets?|biseries?|triseries?|circuitos?|circuits?|giant ?sets?)\b/i.test(text) && !/\d+\s*x\s*\d/.test(text)) {
      supersetLetter = String.fromCharCode(65 + supersetCount++);
      continue;
    }
    if (/^(notas?|notes?|obs|observaciones|comentarios)\s*[:\-]\s*(.+)$/i.test(text)) {
      const note = text.replace(/^[^:\-]+[:\-]\s*/, '').trim();
      if (last && !notesMode) last.notes.push(note);
      else unparsed.push(raw.trim());
      continue;
    }

    const looksDay = DAY_RE.test(text) && !STRONG_EXERCISE.test(text) && !isProse(text) && wordCount(text) <= 6;
    // Without day names, focus headers (PUSH, Pecho y tríceps) are the days.
    const groupDay = !hasDayNames && !hasDigits && isGroupHeader(text.replace(/:$/, ''));
    if (looksDay || groupDay) {
      day = { label: text.replace(/[:\-–\s]+$/, '').trim(), exercises: [], subtitles: 0 };
      days.push(day);
      last = null;
      columns = null;
      supersetLetter = null;
      notesMode = false;
      continue;
    }

    // Right under a day name: its focus ("Piernas A + abdomen", "Cuádriceps y glúteos").
    if (day && day.exercises.length === 0 && day.subtitles < 2 && isSubtitle(text)) {
      day.label = day.label ? `${day.label} · ${text.replace(/[:\-–\s]+$/, '')}` : text;
      day.subtitles += 1;
      continue;
    }

    // Section of advice ("NOTAS DEL DÍA", "ABDOMEN CON CONTROL" followed by sentences).
    if (!hasDigits && (NOTES_HEADING.test(text) || (last && isAllCaps(text) && wordCount(text) >= 2 && isProse(nextText(i)) && !STRONG_EXERCISE.test(nextText(i))))) {
      notesMode = true;
      unparsed.push(raw.trim());
      continue;
    }
    if (notesMode && !STRONG_EXERCISE.test(text)) {
      unparsed.push(raw.trim());
      continue;
    }
    notesMode = false;

    if (!hasDigits) {
      const header = detectTableHeader(text);
      if (header) {
        columns = header;
        continue;
      }
    }

    // A name split over two lines ("Jalón al pecho, agarre" / "neutro", "Prensa a" / "45 grados").
    const fieldsPreview = hasDigits ? extractFields(text) : null;
    if (last && last.nameOnly && !isProse(text) && wordCount(text) <= 4 && !STRONG_EXERCISE.test(text) &&
        (!fieldsPreview || !hasAnyField(fieldsPreview)) && /[a-záéíóúñ]/i.test(text)) {
      const piece = tidyName(cleanName(text), { keepTrailingConnectors: true });
      const joined = tidyName(`${last.detectedName} ${piece}`, { keepTrailingConnectors: true });
      if (!/[A-Za-zÁÉÍÓÚÑáéíóúñ]{3}/.test(piece)) continue; // stray marks between the two lines
      if (joined.split(' ').length <= 9) {
        last.detectedName = joined;
        last.sourceText.push(raw.trim());
        continue;
      }
    }

    // Long sentences are advice even if they mention "3 series" ("Sem. 1-2: 3 series pasan a 2…").
    if (isProse(text) && text.split(/\s+/).filter((w) => /[A-Za-zÁÉÍÓÚÑáéíóúñ]{2}/.test(w)).length >= 9) {
      unparsed.push(raw.trim());
      continue;
    }
    // Advice sentences: a technique cue under an exercise goes to its notes.
    if (isProse(text) && !STRONG_EXERCISE.test(text)) {
      if (last && !last.nameOnly && !hasDigits) last.notes.push(text.replace(/\s+/g, ' ').trim());
      else unparsed.push(raw.trim());
      continue;
    }

    if (!hasDigits) {
      // A routine title before any exercise ("RUTINA FULL BODY", "Plan de fuerza").
      if (!seenExercise && !name && /\b(rutina|routine|programa|program|plan|entrenamiento|workout)\b/i.test(text)) {
        name = { value: text.replace(/[:\-–\s]+$/, ''), confidence: lineConf };
        continue;
      }
      if (/^(al fallo|amrap|to failure)$/i.test(text) && last) {
        last.notes.push(/amrap/i.test(text) ? 'AMRAP' : 'Al fallo');
        continue;
      }
      const nameOnly = tidyName(cleanName(text), { keepTrailingConnectors: true });
      // A text-only line the OCR itself doubts is usually noise (edges, shadows): don't
      // turn it into an exercise, list it as "not interpreted" instead.
      if (looksLikeName(nameOnly) && lineConf !== 'low') {
        addExercise(nameOnly, {}, { raw: raw.trim(), nameConfidence: lineConf, superset });
      } else unparsed.push(raw.trim());
      continue;
    }

    // Lines with numbers.
    const f = fieldsPreview;
    // A name with stray digits from a picture ("Jalón al pecho, agarre I 1", "Curl femoral 7").
    if (!hasAnyField(f) && !columns) {
      const nameish = tidyName(cleanName(text), { keepTrailingConnectors: true });
      if (looksLikeName(nameish) && nameish.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '').length >= 6 && /^[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(nameish) && !isProse(text) && lineConf !== 'low') {
        addExercise(nameish, {}, { raw: raw.trim(), nameConfidence: lineConf === 'high' ? 'medium' : lineConf, superset });
        continue;
      }
    }
    const before = tidyName(cleanName(text.slice(0, Math.min(f.first, text.length))));
    const after = cleanName(f.remaining.slice(Number.isFinite(f.first) ? f.first : text.length));

    if (columns && !f.sets && !f.reps) {
      const row = parseTableRow(text, columns);
      if (row && looksLikeName(cleanName(row.name || ''))) {
        for (const k of NUMERIC_FIELDS) soften(row[k]);
        const ex = addExercise(cleanName(row.name), row, { raw: raw.trim(), nameConfidence: lineConf, superset });
        checkRanges(ex);
        continue;
      }
    }

    for (const k of NUMERIC_FIELDS) soften(f[k]);
    if (looksLikeName(before) && hasAnyField(f)) {
      const ex = addExercise(before, f, { raw: raw.trim(), nameConfidence: lineConf, superset });
      const note = tidyName(after);
      if (note && note.length >= 4 && /[a-z]{3}/i.test(note)) ex.notes.push(note);
      checkRanges(ex);
      continue;
    }

    // Detail line ("4 series", "10 reps", "Descanso: 90 s", "RIR 2"): fills the previous exercise.
    if (hasAnyField(f) && last && (!before || !looksLikeName(before))) {
      let used = false;
      for (const k of NUMERIC_FIELDS) {
        if (f[k] && !last[k]) {
          last[k] = f[k];
          used = true;
        }
      }
      if (used) {
        last.nameOnly = false;
        for (const n of f.notes) if (!last.notes.includes(n)) last.notes.push(n);
        last.sourceText.push(raw.trim());
        checkRanges(last);
        continue;
      }
    }
    unparsed.push(raw.trim());
  }

  for (const d of days) {
    delete d.subtitles;
    for (const ex of d.exercises) {
      delete ex.nameOnly;
      ex.detectedName = tidyName(ex.detectedName) || ex.detectedName;
    }
  }
  return {
    name,
    days: days.filter((d) => d.exercises.length > 0),
    unparsed,
  };
}

module.exports = { parseRoutineText, normalizeLine, detectTableHeader, extractFields };
