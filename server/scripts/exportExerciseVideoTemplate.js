require("dotenv").config({ path: "../.env" });
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Exercise = require("../models/Exercise");

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);

  const exercises = await Exercise.find({})
    .sort({ name: 1 })
    .select("name youtubeVideoId videoUrl muscleGroup equipment")
    .lean();

  const template = exercises.map((ex) => ({
    name: ex.name,
    youtubeVideoId: ex.youtubeVideoId || "",
    videoUrl: ex.videoUrl || "",
    muscleGroup: ex.muscleGroup || "",
    equipment: ex.equipment || "",
  }));

  const outDir = path.join(__dirname, "../data");
  const outPath = path.join(outDir, "exercise-video-template.json");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(template, null, 2), "utf8");

  const withYoutube = template.filter((e) => e.youtubeVideoId).length;
  const withShort = template.filter((e) => e.videoUrl).length;
  const fullCoverage = template.filter((e) => e.youtubeVideoId && e.videoUrl).length;

  console.log(
    JSON.stringify(
      {
        total: template.length,
        withYoutube,
        withShort,
        fullCoverage,
        output: outPath,
      },
      null,
      2,
    ),
  );

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("exportExerciseVideoTemplate error:", err);
  process.exit(1);
});

