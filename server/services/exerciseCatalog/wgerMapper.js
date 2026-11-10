/*
 * wger.de exercise (API v2 /exerciseinfo) → this app's Exercise document.
 *
 * wger data is licensed CC-BY-SA (a few CC0): every imported exercise keeps its
 * source, author and license so the app can credit it (required by the license).
 * Only exercises with a Spanish translation are imported (the app is in Spanish);
 * the English name and wger's aliases become `aliases` for name matching.
 */

const SPANISH = 4;
const ENGLISH = 2;

// wger muscle (name_en) → muscleGroup enum of the Exercise model.
const MUSCLE_GROUP = {
  Hamstrings: 'legs',
  Quads: 'legs',
  Glutes: 'glutes',
  Shoulders: 'shoulders',
  'Obliquus externus abdominis': 'abs',
  Abs: 'abs',
  Triceps: 'triceps',
  Biceps: 'biceps',
  Brachialis: 'biceps',
  Calves: 'calves',
  Soleus: 'calves',
  Chest: 'chest',
  'Serratus anterior': 'chest',
  Trapezius: 'back',
  Lats: 'back',
};
const CATEGORY_GROUP = { Abs: 'abs', Legs: 'legs', Shoulders: 'shoulders', Chest: 'chest', Back: 'back', Calves: 'calves', Cardio: 'cardio' };

const stripAccents = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
const lower = (s) => stripAccents(s).toLowerCase();

function muscleOf(m) {
  return MUSCLE_GROUP[m.name_en] || MUSCLE_GROUP[m.name] || null;
}

function muscleGroup(ex, name) {
  const n = lower(name);
  if (/\b(muneca|antebrazo|wrist|forearm|agarre de granjero|farmer)\b/.test(n)) return 'forearms';
  const primary = (ex.muscles || []).map(muscleOf).find(Boolean);
  if (primary) return primary;
  if (ex.category?.name === 'Arms') {
    if (/tricep|fondos|press frances|patada/.test(n)) return 'triceps';
    return 'biceps';
  }
  return CATEGORY_GROUP[ex.category?.name] || 'full_body';
}

function equipment(ex, name, enName) {
  const n = `${lower(name)} ${lower(enName)}`;
  const eq = (ex.equipment || []).map((q) => q.name);
  if (/\b(maquina|machine|prensa|smith|hammer ?strength|leverage)\b/.test(n)) return 'machine';
  if (eq.includes('Cable machine') || /\bpolea\b|\bcable\b/.test(n)) return 'cable';
  if (eq.includes('Barbell') || eq.includes('SZ-Bar')) return 'barbell';
  if (eq.includes('Dumbbell')) return 'dumbbell';
  if (eq.includes('Kettlebell')) return 'kettlebell';
  if (eq.includes('Resistance band')) return 'band';
  if (eq.includes('none (bodyweight exercise)') || eq.includes('Pull-up bar') || eq.includes('Gym mat')) return 'bodyweight';
  return eq.length ? 'other' : 'bodyweight';
}

/* HTML (wger descriptions) → { description, instructions } as plain text. */
function htmlToText(html) {
  const decode = (s) => s
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&[a-z]+;/g, ' ');
  const clean = (s) => decode(String(s).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
  const src = String(html || '');
  const instructions = [...src.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((m) => clean(m[1]).replace(/^[^:]{2,30}:\s*/, (p) => (p.length < 32 ? '' : p)))
    .filter((s) => s.length > 3)
    .slice(0, 12);
  const firstParagraphs = [...src.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => clean(m[1])).filter((s) => s.length > 20 && !/:$/.test(s));
  let description = firstParagraphs[0] || (instructions.length ? '' : clean(src));
  if (description.length > 600) description = `${description.slice(0, 597).replace(/\s+\S*$/, '')}…`;
  return { description, instructions };
}

const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function mapWgerExercise(ex) {
  const es = (ex.translations || []).find((t) => t.language === SPANISH && t.name && t.name.trim());
  if (!es) return null;
  const en = (ex.translations || []).find((t) => t.language === ENGLISH);
  const name = capitalize(es.name.replace(/\s+/g, ' ').trim()).slice(0, 120);
  const { description, instructions } = htmlToText(es.description || es.description_source);
  const group = muscleGroup(ex, name);
  const secondary = [...new Set((ex.muscles_secondary || []).map(muscleOf).filter((g) => g && g !== group))];
  const aliases = [...new Set([
    en?.name,
    ...(es.aliases || []).map((a) => a.alias || a),
    ...((en && en.aliases) || []).map((a) => a.alias || a),
  ].filter((a) => typeof a === 'string' && a.trim() && lower(a) !== lower(name)).map((a) => a.trim()))].slice(0, 10);
  const image = (ex.images || []).find((i) => i.is_main) || (ex.images || [])[0];
  return {
    name,
    description,
    instructions,
    muscleGroup: group,
    secondaryMuscles: secondary,
    equipment: equipment(ex, name, en?.name),
    difficulty: 'intermediate',
    category: ex.category?.name === 'Cardio' ? 'endurance' : 'hypertrophy',
    imageUrl: image?.image || '',
    aliases,
    source: {
      provider: 'wger',
      externalId: String(ex.id),
      url: `https://wger.de/exercise/${ex.id}/view/`,
      license: ex.license?.short_name || '',
      licenseUrl: ex.license?.url || '',
      author: es.license_author || ex.license_author || '',
      imageAuthor: image?.license_author || '',
    },
  };
}

/* Quality first (description, image) so duplicates by name keep the best one. */
function mapAll(results) {
  return (results || [])
    .map(mapWgerExercise)
    .filter(Boolean)
    .sort((a, b) => Number(Boolean(b.description)) + Number(Boolean(b.imageUrl)) - (Number(Boolean(a.description)) + Number(Boolean(a.imageUrl))));
}

module.exports = { mapWgerExercise, mapAll, htmlToText };
