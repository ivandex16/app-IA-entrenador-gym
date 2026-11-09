const mongoose = require('mongoose');
const { backfillWorkoutStatus } = require('../migrations/backfillWorkoutStatus');

/* Idempotent data migrations, run once per start after connecting. A failure
   is logged but never blocks the server: reads already handle legacy data. */
async function runMigrations() {
  try {
    const { pending, updated } = await backfillWorkoutStatus();
    if (pending > 0) console.log(`🛠️  Migración status: ${updated}/${pending} sesiones antiguas marcadas como completadas`);
  } catch (err) {
    console.error(`⚠️  Migración status falló (se reintentará en el próximo arranque): ${err.message}`);
  }
}

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    runMigrations();
  } catch (err) {
    console.error(`❌ MongoDB connection error: ${err.message}. Retrying in 5s...`);
    setTimeout(connectDB, 5000);
  }
};

module.exports = connectDB;
