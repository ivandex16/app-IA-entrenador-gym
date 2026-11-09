#!/usr/bin/env node
/*
 * Runs the workout status backfill by hand (it also runs automatically when the
 * server connects to MongoDB, see config/db.js).
 *
 *   MONGODB_URI="mongodb+srv://..." node server/scripts/migrate-workout-status.js --dry-run
 *   MONGODB_URI="mongodb+srv://..." node server/scripts/migrate-workout-status.js
 */
const mongoose = require('mongoose');
const { backfillWorkoutStatus } = require('../migrations/backfillWorkoutStatus');

(async () => {
  const uri = (process.env.MONGODB_URI || '').trim();
  if (!uri) {
    console.error('Falta MONGODB_URI.');
    process.exit(1);
  }
  const dryRun = process.argv.includes('--dry-run');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  const { pending, updated } = await backfillWorkoutStatus({ dryRun });
  console.log(dryRun
    ? `Sesiones sin estado: ${pending} (no se cambió nada, --dry-run).`
    : `Sesiones sin estado: ${pending}. Marcadas como completadas: ${updated}.`);
  await mongoose.disconnect();
})().catch(async (err) => {
  console.error(`Error: ${err.message}`);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
