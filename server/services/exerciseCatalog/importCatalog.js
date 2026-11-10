/*
 * Imports mapped catalog exercises into the Exercise collection.
 *
 * Safe by design:
 *  - exercises that already exist (seed, admin, PDF import…) are never modified:
 *    a candidate whose normalized name matches one of them is skipped;
 *  - documents created by a previous import of the same source are updated in
 *    place (matched by provider + external id), so re-running never duplicates;
 *  - nothing is deleted;
 *  - dryRun reports what would happen without writing.
 */
const Exercise = require('../../models/Exercise');

const norm = (s) =>
  String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

async function importCatalog(docs, { dryRun = false, provider } = {}) {
  const existing = await Exercise.find({}).select('name source').lean();
  const own = new Map(); // name → exercise not from this provider (never touched)
  const imported = new Map(); // externalId → exercise from a previous run
  for (const e of existing) {
    if (e.source?.provider === provider) imported.set(e.source.externalId, e);
    else own.set(norm(e.name), e);
  }

  const report = { candidates: docs.length, inserted: 0, updated: 0, skippedExisting: [], skippedDuplicate: 0 };
  const seen = new Set();
  const ops = [];
  for (const doc of docs) {
    const key = norm(doc.name);
    if (!key) continue;
    if (own.has(key)) {
      report.skippedExisting.push(doc.name);
      continue;
    }
    if (seen.has(key)) {
      report.skippedDuplicate += 1;
      continue;
    }
    seen.add(key);
    const prev = imported.get(doc.source.externalId);
    if (prev) report.updated += 1;
    else report.inserted += 1;
    ops.push({
      updateOne: {
        filter: { 'source.provider': doc.source.provider, 'source.externalId': doc.source.externalId },
        update: { $set: doc },
        upsert: true,
      },
    });
  }
  if (!dryRun && ops.length) {
    for (let i = 0; i < ops.length; i += 200) await Exercise.bulkWrite(ops.slice(i, i + 200), { ordered: false });
  }
  return report;
}

module.exports = { importCatalog };
