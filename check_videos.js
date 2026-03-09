const fs = require("fs");
const content = fs.readFileSync("server/seeds/seedExercises.js", "utf8");
const regex = /name:\s*"(.*?)"[\s\S]*?youtubeVideoId:\s*"(.*?)"/g;
let m;
const entries = [];
while ((m = regex.exec(content)) !== null) {
  entries.push({ name: m[1], vid: m[2] });
}
console.log("Found", entries.length, "exercises");

async function check() {
  const bad = [];
  for (const e of entries) {
    try {
      const r = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${e.vid}&format=json`,
      );
      if (r.status !== 200) {
        bad.push(e);
        console.log(`UNAVAILABLE: ${e.name} -> ${e.vid}`);
      }
    } catch (err) {
      bad.push(e);
      console.log(`ERROR: ${e.name} -> ${e.vid}: ${err.message}`);
    }
  }
  console.log(`\nDone. ${bad.length} unavailable out of ${entries.length}`);
}
check();
