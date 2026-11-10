/*
 * Text helpers for the image → routine import (OCR output). Independent from
 * the PDF importer on purpose: that flow is stable and must not change.
 */

const stripAccents = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');

/* Comparable key: lowercase, no accents, only letters/digits/spaces. */
function normKey(s) {
  return stripAccents(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Characters OCR often reads instead of digits, only fixed inside numeric contexts.
const DIGIT_LOOKALIKES = { O: '0', o: '0', D: '0', Q: '0', I: '1', l: '1', '|': '1', i: '1', S: '5', s: '5', B: '8', Z: '2', z: '2', g: '9' };
const LOOK = "OoDQIl|iSsBZzg";
const lookalikeToDigits = (tok) => tok.replace(/[OoDQIl|iSsBZzg]/g, (c) => DIGIT_LOOKALIKES[c]);

/*
 * Normalizes one OCR line. Returns { text, fixed } where `fixed` says a
 * numeric value was repaired (the parser then lowers its confidence).
 *  - unicode dashes → "-", × ✕ * X → "x" between numbers, "4 x 10" → "4x10"
 *  - "4xl0" / "4x1O" / "O" in numbers → digits
 */
function normalizeLine(raw) {
  let fixed = false;
  let text = String(raw || '')
    .replace(/[‐-―−]/g, '-')
    .replace(/[‘’´`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\t+/g, ' | ')
    .replace(/ {3,}/g, ' | ') // wide gaps from OCR with preserved spaces = table columns
    .replace(/[  ]+/g, ' ')
    .trim();

  const MULT = '[xX×✕✖*]';
  // Lookalikes right after/before a multiplication sign: "4xl0", "4 x 1O", "S x 10".
  const after = new RegExp(`(\\d)\\s*${MULT}\\s*([0-9${LOOK}]{1,3})(?![A-Za-z])`, 'g');
  text = text.replace(after, (m, a, b) => {
    const d = lookalikeToDigits(b);
    if (d !== b) fixed = true;
    return `${a}x${d}`;
  });
  const before = new RegExp(`(^|[^A-Za-z0-9])([${LOOK}])\\s*${MULT}\\s*(\\d)`, 'g');
  text = text.replace(before, (m, pre, a, b) => {
    fixed = true;
    return `${pre}${lookalikeToDigits(a)}x${b}`;
  });
  // "3% 10-15": OCR reads a small "×" as "%" when a space follows it.
  text = text.replace(/(?<![\d.,])(\d{1,2})\s*%\s+(\d)/g, (m, a, b) => {
    fixed = true;
    return `${a}x${b}`;
  });
  // Canonical sets×reps.
  text = text.replace(new RegExp(`(\\d)\\s*${MULT}\\s*(\\d)`, 'g'), '$1x$2');
  // "1O kg", "8O s": a letter O stuck to digits before a unit.
  text = text.replace(/\b(\d+)[Oo](\d*)\s*(kg|kgs|lb|lbs|s|seg|sec|min)\b/gi, (m, a, b, u) => {
    fixed = true;
    return `${a}0${b} ${u}`;
  });
  return { text, fixed };
}

/* Leading list markers: "1.", "2)", "-", "•", "*", "·", ">", and circled numbers as OCR
   reads them ("QQ", "©", "@", "(1)", "[1)", "o"). Superset labels (A1, B2) are kept apart. */
function stripListMarker(text) {
  const superset = /^\(?([A-Ha-h])\s?([1-9])\s*[).:\-]?\s+(?=[A-Za-zÁÉÍÓÚÑáéíóúñ])/.exec(text);
  if (superset) return { text: text.slice(superset[0].length), superset: superset[1].toUpperCase() };
  let t = text.replace(/^\s*(?:\d{1,2}\s*[.)\-:]\s+(?=[A-Za-zÁÉÍÓÚÑáéíóúñ])|[-•*·>~]+\s*)/, '');
  // Circled numbers / OCR marks: short tokens of symbols, O/Q/o and digits before a name.
  t = t.replace(/^(?:(?:[\[({]?[©®@°ºOoQq0-9|]{1,3}[\])}]?|\([A-Za-z]\))\s+){1,2}(?=[A-ZÁÉÍÓÚÑ])/, '');
  // "1 Sentadilla" (number without punctuation) but never "3 series" / "10 Reps".
  if (!/^\d{1,2}\s+(series|serie|sets?|reps?|repeticiones|rondas|rounds)\b/i.test(t)) {
    t = t.replace(/^\d{1,2}\s+(?=[A-ZÁÉÍÓÚÑ][a-záéíóúñ])/, '');
  }
  return { text: t, superset: null };
}

const NAME_CONNECTORS = new Set(['a', 'y', 'o', 'e', 'de', 'del', 'con', 'en', 'al', 'la', 'el', 'and', 'with', 'on', 'the']);

/* Removes OCR debris around a name: stray symbols and single characters at the
   ends ("Remo sentado en polea a" → "Remo sentado en polea", "agarre 1" → "agarre"). */
function tidyName(name, { keepTrailingConnectors = false } = {}) {
  const words = String(name || '').replace(/[«»"“”®©@£$%&#*~^<>{}\[\]]/g, ' ').split(/\s+/).filter(Boolean)
    .filter((w) => !/^[Il|1!]{2,3}$/.test(w)) // "II", "|1": vertical strokes read from pictures
    .filter((w) => w.length > 1 || /^[aoyAOY]$/.test(w)); // stray single letters ("cadera f e en máquina")
  const junk = (w) => (w.length === 1 && !NAME_CONNECTORS.has(w.toLowerCase())) || /^[^A-Za-zÁÉÍÓÚÑáéíóúñü0-9]+$/.test(w);
  // A name may continue on the next line ("Curl de bíceps con" / "mancuernas"): keep its last connector until then.
  while (words.length && (junk(words[words.length - 1]) || (!keepTrailingConnectors && NAME_CONNECTORS.has(words[words.length - 1].toLowerCase())))) words.pop();
  while (words.length && junk(words[0])) words.shift();
  return words.join(' ');
}

/* Share of letters/digits: tells text from OCR noise like "|| ~~ ;:". */
function signalRatio(text) {
  const t = text.replace(/\s/g, '');
  if (!t) return 0;
  return (t.match(/[A-Za-zÁÉÍÓÚÑáéíóúñü0-9]/g) || []).length / t.length;
}

module.exports = { stripAccents, normKey, normalizeLine, stripListMarker, signalRatio, tidyName };
