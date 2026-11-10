/*
 * Imports exercises with a Spanish name from wger.de (open data, CC-BY-SA)
 * into the exercise catalog. Existing exercises are never modified or deleted;
 * re-running updates the previously imported ones instead of duplicating them.
 *
 *   node scripts/import-exercises.js --dry-run            # show what would change
 *   node scripts/import-exercises.js                      # import (uses MONGODB_URI)
 *   node scripts/import-exercises.js --file wger.json     # use a saved /exerciseinfo dump
 *
 * Data source: https://wger.de/api/v2/exerciseinfo/ — credit is stored per exercise.
 */
require('dotenv').config();
const fs = require('fs');
const mongoose = require('mongoose');
const { mapAll } = require('../services/exerciseCatalog/wgerMapper');
const { importCatalog } = require('../services/exerciseCatalog/importCatalog');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const fileArg = args.includes('--file') ? args[args.indexOf('--file') + 1] : null;
const API = 'https://wger.de/api/v2/exerciseinfo/?limit=200';

async function fetchAll() {
  const out = [];
  let url = API;
  while (url) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 60_000);
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json', 'User-Agent': 'temple-app-catalog-import' } });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`wger respondió ${res.status} en ${url}`);
    const page = await res.json();
    out.push(...page.results);
    url = page.next;
    process.stdout.write(`  descargados ${out.length}/${page.count}\r`);
  }
  process.stdout.write('\n');
  return out;
}

(async () => {
  if (!process.env.MONGODB_URI) throw new Error('Falta MONGODB_URI');
  const results = fileArg ? JSON.parse(fs.readFileSync(fileArg, 'utf8')).results : await fetchAll();
  const docs = mapAll(results);
  console.log(`wger: ${results.length} ejercicios, ${docs.length} con nombre en español`);

  await mongoose.connect(process.env.MONGODB_URI);
  if (!dryRun) await mongoose.model('Exercise').syncIndexes();
  const report = await importCatalog(docs, { dryRun, provider: 'wger' });
  console.log(`${dryRun ? '[simulación] ' : ''}nuevos: ${report.inserted} · actualizados: ${report.updated} · ya existían (sin tocar): ${report.skippedExisting.length} · nombres repetidos en wger: ${report.skippedDuplicate}`);
  if (report.skippedExisting.length) console.log(`  sin tocar: ${report.skippedExisting.slice(0, 20).join(', ')}${report.skippedExisting.length > 20 ? '…' : ''}`);
  await mongoose.disconnect();
})().catch(async (err) => {
  console.error('Error:', err.message);
  try { await mongoose.disconnect(); } catch { /* ignore */ }
  process.exit(1);
});
