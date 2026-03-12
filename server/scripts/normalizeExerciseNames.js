require("dotenv").config({ path: "../.env" });
const mongoose = require("mongoose");
const Exercise = require("../models/Exercise");

function normalizeRawName(name) {
  let n = String(name || "");
  n = n.replace(/^\s*[-•]+\s*/g, "").trim();
  n = n.replace(/\s+[–—-]+\s*$/g, "").trim();

  const enPattern = n.match(/^(\d+)\s+of\s+(\d+)$/i);
  if (enPattern) {
    return `Ejercicio ${enPattern[1]} de ${enPattern[2]}`;
  }

  // Remove ordinal prefix like "1 Curl..." but keep meaningful numbers in names.
  n = n.replace(/^\s*\d+\s+(?=[A-Za-zÁÉÍÓÚÜÑáéíóúüñ])/, "").trim();
  return n;
}

function uniqueName(base, usedSet) {
  if (!usedSet.has(base.toLowerCase())) return base;
  let i = 2;
  while (usedSet.has(`${base} (${i})`.toLowerCase())) i++;
  return `${base} (${i})`;
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const all = await Exercise.find({}).sort({ name: 1 });
  const used = new Set(all.map((e) => String(e.name || "").toLowerCase()));

  let changed = 0;
  const preview = [];

  for (const ex of all) {
    const oldName = String(ex.name || "").trim();
    const clean = normalizeRawName(oldName);
    if (!clean || clean === oldName) continue;

    used.delete(oldName.toLowerCase());
    const finalName = uniqueName(clean, used);
    used.add(finalName.toLowerCase());

    ex.name = finalName;
    await ex.save();
    changed++;
    preview.push({ from: oldName, to: finalName });
  }

  console.log(JSON.stringify({ changed, sample: preview.slice(0, 30) }, null, 2));
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("normalizeExerciseNames error:", err);
  process.exit(1);
});

