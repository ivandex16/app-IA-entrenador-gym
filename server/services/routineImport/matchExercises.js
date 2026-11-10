/*
 * Matches detected exercise names against the catalog without guessing:
 *   1. exact (accents/case/stopwords ignored) or a known ES/EN alias → selected
 *   2. the detected words appear in exactly one catalog name, or a clearly
 *      better fuzzy score → selected, but shown as "approximate"
 *   3. several plausible names → options for the user, nothing selected
 *   4. nothing similar → user picks manually or creates the exercise
 */
const { normKey } = require('./textUtils');

const STOPWORDS = new Set(['de', 'del', 'con', 'en', 'la', 'el', 'los', 'las', 'a', 'al', 'y', 'para', 'por', 'the', 'with', 'on', 'of', 'and', 'to']);

/* Alias → catalog name (both normalized). Only unambiguous equivalences. */
const ALIASES = {
  'bench press': 'press de banca',
  'barbell bench press': 'press de banca',
  'flat bench press': 'press de banca',
  'press banca': 'press de banca',
  'press plano': 'press de banca',
  'press banca plano': 'press de banca',
  'press de banca plano': 'press de banca',
  'incline dumbbell press': 'press inclinado con mancuernas',
  'decline bench press': 'press declinado con barra',
  'dumbbell fly': 'aperturas con mancuernas',
  'dumbbell flyes': 'aperturas con mancuernas',
  'cable crossover': 'cruces en polea',
  'cable fly': 'cruces en polea',
  'push up': 'flexiones',
  'push ups': 'flexiones',
  'pushups': 'flexiones',
  'deadlift': 'peso muerto',
  'pull up': 'dominadas',
  'pull ups': 'dominadas',
  'pullups': 'dominadas',
  'chin up': 'dominadas',
  'barbell row': 'remo con barra',
  'bent over row': 'remo con barra',
  'lat pulldown': 'jalon al pecho en polea',
  'jalon al pecho': 'jalon al pecho en polea',
  'jalon': 'jalon al pecho en polea',
  'one arm dumbbell row': 'remo con mancuerna a una mano',
  'seated cable row': 'remo en polea baja',
  'overhead press': 'press militar',
  'military press': 'press militar',
  'shoulder press': 'press militar',
  'lateral raise': 'elevaciones laterales',
  'lateral raises': 'elevaciones laterales',
  'front raise': 'elevaciones frontales',
  'front raises': 'elevaciones frontales',
  'arnold press': 'press arnold',
  'rear delt fly': 'pajaros elevaciones posteriores',
  'reverse fly': 'pajaros elevaciones posteriores',
  'squat': 'sentadilla con barra',
  'back squat': 'sentadilla con barra',
  'barbell squat': 'sentadilla con barra',
  'sentadilla': 'sentadilla con barra',
  'leg press': 'prensa de piernas',
  'prensa': 'prensa de piernas',
  'romanian deadlift': 'peso muerto rumano',
  'rdl': 'peso muerto rumano',
  'lunges': 'zancadas lunges',
  'lunge': 'zancadas lunges',
  'zancadas': 'zancadas lunges',
  'bulgarian split squat': 'sentadilla bulgara',
  'leg extension': 'extensiones de cuadriceps',
  'leg extensions': 'extensiones de cuadriceps',
  'extension de cuadriceps': 'extensiones de cuadriceps',
  'leg curl': 'curl femoral',
  'hamstring curl': 'curl femoral',
  'sumo deadlift': 'peso muerto sumo',
  'barbell curl': 'curl con barra',
  'hammer curl': 'curl martillo',
  'concentration curl': 'curl concentrado',
  'cable curl': 'curl en polea baja',
  'dips': 'fondos en paralelas',
  'fondos': 'fondos en paralelas',
  'skull crusher': 'press frances rompecraneos',
  'skull crushers': 'press frances rompecraneos',
  'press frances': 'press frances rompecraneos',
  'triceps pushdown': 'extension de triceps en polea',
  'tricep pushdown': 'extension de triceps en polea',
  'cable pushdown': 'extension de triceps en polea',
  'triceps kickback': 'patada de triceps kickback',
  'plank': 'plancha',
  'hanging leg raise': 'elevacion de piernas colgado',
  'crunch': 'crunch abdominal',
  'crunches': 'crunch abdominal',
  'abdominales': 'crunch abdominal',
  'glute bridge': 'puente de gluteos',
  'cable kickback': 'patada de gluteo en polea',
  'standing calf raise': 'elevaciones de pantorrilla de pie',
  'calf raise': 'elevaciones de pantorrilla de pie',
  'seated calf raise': 'elevaciones de pantorrilla sentado',
  'wrist curl': 'curl de muneca con barra',
  'remo sentado en polea': 'remo en polea baja',
  'remo sentado': 'remo en polea baja',
  'remo en polea sentado': 'remo en polea baja',
  'gemelos de pie': 'elevaciones de pantorrilla de pie',
  'gemelos sentado': 'elevaciones de pantorrilla sentado',
  'elevacion de talones de pie': 'elevaciones de pantorrilla de pie',
  'peso muerto rumano con mancuernas': 'peso muerto rumano',
  'curl femoral sentado': 'curl femoral',
  'curl femoral tumbado': 'curl femoral',
  'farmer walk': 'farmer',
  'farmers walk': 'farmer',
  'jumping jacks': 'saltos de tijera jumping jacks',
  'box jump': 'salto a cajon box jump',
  'box jumps': 'salto a cajon box jump',
  'jump squat': 'sentadilla con salto',
};

const tokens = (key) => key.split(' ').filter((w) => w && !STOPWORDS.has(w));
const core = (key) => tokens(key).join(' ');

function bigrams(s) {
  const t = s.replace(/\s+/g, ' ');
  const out = new Map();
  for (let i = 0; i < t.length - 1; i++) {
    const g = t.slice(i, i + 2);
    out.set(g, (out.get(g) || 0) + 1);
  }
  return out;
}
function dice(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const A = bigrams(a);
  const B = bigrams(b);
  let inter = 0;
  for (const [g, n] of A) inter += Math.min(n, B.get(g) || 0);
  const total = [...A.values()].reduce((s, n) => s + n, 0) + [...B.values()].reduce((s, n) => s + n, 0);
  return total ? (2 * inter) / total : 0;
}
/* Words one letter apart that mean opposite movements: never treated as a typo. */
const OPPOSITES = [['abduccion', 'aduccion'], ['abduction', 'adduction'], ['abductor', 'aductor'], ['abductores', 'aductores']];
const opposite = (a, b) => OPPOSITES.some(([x, y]) => (a.startsWith(x) && b.startsWith(y)) || (a.startsWith(y) && b.startsWith(x)));

/* Same word allowing one OCR typo in longer words ("sentadila" = "sentadilla"). */
function sameWord(a, b) {
  if (a === b) return true;
  if (opposite(a, b)) return false;
  if (a.length < 5 || b.length < 5) return false;
  if (a.startsWith(b) || b.startsWith(a)) return Math.abs(a.length - b.length) <= 2; // plural / gender
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

function buildCatalog(exercises) {
  return exercises.map((e) => {
    const key = normKey(e.name);
    // Other names of the exercise (e.g. English, from an imported catalog) also match exactly.
    const aliasKeys = (e.aliases || []).map(normKey).filter(Boolean);
    return { exercise: e, key, core: core(key), tokens: tokens(key), aliasKeys, aliasCores: aliasKeys.map(core) };
  });
}

function score(detectedCore, detectedTokens, entry) {
  // "Abducción" vs "Aducción": the rest of the name may be identical, but it's another exercise.
  if (detectedTokens.some((w) => entry.tokens.some((t) => opposite(w, t)))) return 0;
  const covered = detectedTokens.filter((w) => entry.tokens.some((t) => sameWord(w, t))).length;
  const overlap = detectedTokens.length ? covered / Math.max(detectedTokens.length, entry.tokens.length) : 0;
  // The first word is usually the movement (curl, press, remo…): it weighs more than the equipment.
  const sameMovement = detectedTokens[0] && entry.tokens[0] && sameWord(detectedTokens[0], entry.tokens[0]) ? 0.15 : 0;
  return 0.55 * dice(detectedCore, entry.core) + 0.45 * overlap + sameMovement;
}

const summary = (e, s) => ({ _id: String(e._id), name: e.name, muscleGroup: e.muscleGroup, ...(s != null ? { score: Math.round(s * 100) / 100 } : {}) });

function matchExercise(detectedName, catalog) {
  const key = normKey(detectedName);
  const detectedCore = core(key);
  const detectedTokens = tokens(key);
  if (!detectedCore) return { status: 'none', candidates: [] };

  // 1. Exact (ignoring stopwords) or alias.
  const exact = catalog.find((c) => c.key === key || c.core === detectedCore);
  if (exact) return { status: 'auto', confidence: 'high', exercise: summary(exact.exercise), candidates: [] };
  const byAlias = catalog.find((c) => c.aliasKeys.includes(key) || c.aliasCores.includes(detectedCore));
  if (byAlias) return { status: 'auto', confidence: 'high', exercise: summary(byAlias.exercise), candidates: [], via: 'alias' };
  const aliasTarget = ALIASES[key] || ALIASES[detectedCore];
  if (aliasTarget) {
    const hit = catalog.find((c) => c.key === aliasTarget || c.core === core(aliasTarget));
    if (hit) return { status: 'auto', confidence: 'high', exercise: summary(hit.exercise), candidates: [], via: 'alias' };
  }

  const ranked = catalog
    .map((c) => ({ c, s: score(detectedCore, detectedTokens, c) }))
    .sort((a, b) => b.s - a.s);
  const candidates = ranked.filter((r) => r.s >= 0.4).slice(0, 4).map((r) => summary(r.c.exercise, r.s));

  // 1b. A known alias plus extra detail ("Jalón al pecho, agarre neutro" ⊇ "jalon al pecho").
  const aliasHit = Object.entries(ALIASES)
    .map(([k, target]) => ({ k: tokens(k), target }))
    .filter(({ k }) => k.length >= 2 && k.every((t) => detectedTokens.some((w) => sameWord(w, t))))
    .sort((a, b) => b.k.length - a.k.length)[0];
  if (aliasHit) {
    const hit = catalog.find((c) => c.key === aliasHit.target || c.core === core(aliasHit.target));
    if (hit) return { status: 'auto', confidence: 'medium', exercise: summary(hit.exercise), candidates: [], via: 'alias' };
  }

  // 2a. Every detected word is in exactly one catalog name ("Fondos" → "Fondos en Paralelas").
  const containing = catalog.filter((c) => detectedTokens.length > 0 && detectedTokens.every((w) => c.tokens.some((t) => sameWord(w, t))));
  if (containing.length === 1 && detectedTokens.join('').length >= 4) {
    return { status: 'auto', confidence: 'medium', exercise: summary(containing[0].exercise), candidates };
  }
  // 2b. The detected name is a catalog name plus details ("Prensa de piernas a 45 grados" →
  //     "Prensa de Piernas", "Curl femoral sentado" → "Curl Femoral"): the longest such name, if unique.
  const contained = catalog
    .filter((c) => c.tokens.length >= 2 && c.tokens.every((t) => detectedTokens.some((w) => sameWord(w, t))))
    .sort((a, b) => b.tokens.length - a.tokens.length);
  if (contained.length && (contained.length === 1 || contained[0].tokens.length > contained[1].tokens.length)) {
    return { status: 'auto', confidence: 'medium', exercise: summary(contained[0].exercise), candidates };
  }
  // 2c. A clearly better fuzzy match (typos, OCR noise).
  const [best, second] = ranked;
  if (best && best.s >= 0.8 && (!second || best.s - second.s >= 0.12)) {
    return { status: 'auto', confidence: 'medium', exercise: summary(best.c.exercise), candidates };
  }
  // 3/4. Let the user decide.
  return { status: candidates.length ? 'ambiguous' : 'none', candidates };
}

module.exports = { buildCatalog, matchExercise, ALIASES };
