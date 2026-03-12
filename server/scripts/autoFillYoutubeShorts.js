require("dotenv").config({ path: "../.env" });
const mongoose = require("mongoose");
const Exercise = require("../models/Exercise");

const API_KEY = process.env.YOUTUBE_API_KEY;

async function searchYoutubeShortId(query) {
  const url =
    "https://www.googleapis.com/youtube/v3/search"
    + `?part=snippet&type=video&maxResults=8&safeSearch=moderate&q=${encodeURIComponent(query)}&key=${API_KEY}`;

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`YouTube search failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const json = await res.json();
  const items = Array.isArray(json.items) ? json.items : [];
  if (!items.length) return null;

  // Prefer explicit shorts in title/description
  const scored = items
    .map((it) => {
      const id = it?.id?.videoId;
      if (!id) return null;
      const title = String(it?.snippet?.title || "").toLowerCase();
      const desc = String(it?.snippet?.description || "").toLowerCase();
      const text = `${title} ${desc}`;
      let score = 0;
      if (text.includes("short")) score += 5;
      if (text.includes("#shorts")) score += 5;
      if (text.includes("tutorial")) score += 2;
      if (text.includes("exercise") || text.includes("ejercicio")) score += 2;
      return { id, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.id || items[0]?.id?.videoId || null;
}

async function run() {
  if (!API_KEY) {
    throw new Error("Falta YOUTUBE_API_KEY en .env");
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const exercises = await Exercise.find({}).select("name youtubeVideoId videoUrl").lean();
  let updated = 0;
  let skipped = 0;

  for (const ex of exercises) {
    const q = `${ex.name} gym exercise #shorts`;
    let shortId = null;
    try {
      shortId = await searchYoutubeShortId(q);
    } catch (err) {
      console.log(`search_error: ${ex.name} -> ${err.message}`);
      skipped++;
      continue;
    }

    if (!shortId) {
      skipped++;
      continue;
    }

    await Exercise.updateOne(
      { _id: ex._id },
      {
        $set: {
          youtubeVideoId: shortId,
          videoUrl: `https://www.youtube.com/shorts/${shortId}`,
        },
      },
    );

    updated++;
    await new Promise((r) => setTimeout(r, 120));
  }

  const total = await Exercise.countDocuments();
  const withVideoUrl = await Exercise.countDocuments({ videoUrl: { $nin: ["", null] } });

  console.log(JSON.stringify({ total, updated, skipped, withVideoUrl }, null, 2));
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("autoFillYoutubeShorts error:", err);
  process.exit(1);
});

