function safeParseUrl(raw) {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

function extractYoutubeId(urlObj) {
  if (!urlObj) return "";
  const host = urlObj.hostname.replace(/^www\./, "");
  if (host === "youtu.be") {
    return urlObj.pathname.split("/").filter(Boolean)[0] || "";
  }
  if (host === "youtube.com" || host === "m.youtube.com") {
    const watchId = urlObj.searchParams.get("v");
    if (watchId) return watchId;
    const parts = urlObj.pathname.split("/").filter(Boolean);
    if (parts[0] === "shorts" && parts[1]) return parts[1];
    if (parts[0] === "embed" && parts[1]) return parts[1];
  }
  return "";
}

function isDirectVideoFile(raw) {
  return /\.(mp4|webm|ogg)(\?.*)?$/i.test(String(raw || ""));
}

export function resolveExerciseVideo(exercise) {
  const sources = resolveExerciseVideoSources(exercise);
  return sources[0] || null;
}

function buildVideoFromUrl(rawUrl) {
  const parsed = safeParseUrl(rawUrl);
  const fromYouTubeUrl = extractYoutubeId(parsed);
  if (fromYouTubeUrl) {
    return {
      mode: "embed",
      src: `https://www.youtube.com/embed/${fromYouTubeUrl}`,
      label: "YouTube Shorts",
    };
  }

  if (isDirectVideoFile(rawUrl)) {
    return {
      mode: "file",
      src: rawUrl,
      label: "Video",
    };
  }

  return null;
}

export function resolveExerciseVideoSources(exercise) {
  const sources = [];

  const rawUrl = String(exercise?.videoUrl || "").trim();
  if (rawUrl) {
    const shortVideo = buildVideoFromUrl(rawUrl);
    if (shortVideo) {
      sources.push({
        key: "short",
        title: "YouTube Corto",
        ...shortVideo,
      });
    }
  }

  const ytId = String(exercise?.youtubeVideoId || "").trim();
  if (ytId && sources.length === 0) {
    sources.push({
      key: "short",
      title: "YouTube Corto",
      mode: "embed",
      src: `https://www.youtube.com/embed/${ytId}`,
      label: "YouTube Shorts",
    });
  }

  return sources;
}
