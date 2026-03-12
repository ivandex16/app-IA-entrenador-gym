require("dotenv").config({ path: "../.env" });
const mongoose = require("mongoose");
const Exercise = require("../models/Exercise");

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);

  const exercises = await Exercise.find({
    youtubeVideoId: { $nin: ["", null] },
  }).select("name youtubeVideoId videoUrl");

  let updated = 0;
  for (const ex of exercises) {
    const id = String(ex.youtubeVideoId || "").trim();
    if (!id) continue;
    const shortsUrl = `https://www.youtube.com/shorts/${id}`;
    ex.videoUrl = shortsUrl;
    await ex.save();
    updated++;
  }

  const total = await Exercise.countDocuments();
  const withYoutube = await Exercise.countDocuments({
    youtubeVideoId: { $nin: ["", null] },
  });
  const withVideoUrl = await Exercise.countDocuments({
    videoUrl: { $nin: ["", null] },
  });

  console.log(
    JSON.stringify(
      {
        total,
        withYoutube,
        withVideoUrl,
        updatedToShorts: updated,
      },
      null,
      2,
    ),
  );

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("migrateYoutubeToShorts error:", err);
  process.exit(1);
});

