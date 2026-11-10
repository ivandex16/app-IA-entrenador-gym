/*
 * Search in the exercise selector of the import review. Accents and case don't
 * matter and every word may appear anywhere in the name ("remo maquina" finds
 * "Remo sentado (máquina)"). Names that start with the query come first.
 * Pure functions (unit-tested).
 */

export const normalize = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

/* Items of `list` matching `query`, best first, at most `limit`. Empty query → list as is. */
export function searchExercises(list, query, limit = 60) {
  const q = normalize(query);
  if (!q) return list.slice(0, limit);
  const words = q.split(' ');
  const scored = [];
  for (const item of list) {
    const name = normalize(item.name);
    if (!words.every((w) => name.includes(w))) continue;
    // 0: name starts with the query · 1: a word starts with it · 2: contained
    const score = name.startsWith(q) ? 0 : name.split(/[\s(/-]+/).some((w) => w.startsWith(words[0])) ? 1 : 2;
    scored.push({ item, score, len: name.length });
  }
  scored.sort((a, b) => a.score - b.score || a.len - b.len || a.item.name.localeCompare(b.item.name, 'es'));
  return scored.slice(0, limit).map((s) => s.item);
}
