require("dotenv").config({ path: "../.env" });
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Exercise = require("../models/Exercise");

function normalizeYoutubeId(raw) {
  const value = String(raw || "").trim();
  if (!value) return "";
  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) return value;
  try {
    const url = new URL(value);
    if (url.hostname.includes("youtu.be")) {
      return url.pathname.split("/").filter(Boolean)[0] || "";
    }
    if (url.searchParams.get("v")) return url.searchParams.get("v");
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "shorts" && parts[1]) return parts[1];
    if (parts[0] === "embed" && parts[1]) return parts[1];
  } catch {
    return "";
  }
  return "";
}

async function run() {
  const inputPath = path.join(__dirname, "../data/exercise-video-template.json");
  if (!fs.existsSync(inputPath)) {
    throw new Error(`No existe el archivo: ${inputPath}`);
  }

  const rows = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  if (!Array.isArray(rows)) {
    throw new Error("El archivo debe ser un array JSON.");
  }

  await mongoose.connect(process.env.MONGODB_URI);

  let updated = 0;
  let notFound = 0;

  for (const row of rows) {
    const name = String(row?.name || "").trim();
    if (!name) continue;

    const youtubeVideoId = normalizeYoutubeId(row.youtubeVideoId);
    const videoUrl = String(row?.videoUrl || "").trim();

    const ex = await Exercise.findOne({ name });
    if (!ex) {
      notFound++;
      continue;
    }

    ex.youtubeVideoId = youtubeVideoId;
    ex.videoUrl = videoUrl;
    await ex.save();
    updated++;
  }

  const total = await Exercise.countDocuments();
  const withYoutube = await Exercise.countDocuments({
    youtubeVideoId: { $nin: ["", null] },
  });
  const withShort = await Exercise.countDocuments({
    videoUrl: { $nin: ["", null] },
  });
  const fullCoverage = await Exercise.countDocuments({
    youtubeVideoId: { $nin: ["", null] },
    videoUrl: { $nin: ["", null] },
  });

  console.log(
    JSON.stringify(
      {
        processedRows: rows.length,
        updated,
        notFound,
        total,
        withYoutube,
        withShort,
        fullCoverage,
      },
      null,
      2,
    ),
  );

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("importExerciseVideoTemplate error:", err);
  process.exit(1);
});

