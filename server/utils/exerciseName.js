const Exercise = require("../models/Exercise");

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeExerciseName = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

async function findDuplicateExerciseByName(rawName) {
  const trimmed = String(rawName || "").trim();
  if (!trimmed) return null;

  const exact = await Exercise.findOne({
    name: { $regex: new RegExp(`^${escapeRegex(trimmed)}$`, "i") },
  });
  if (exact) return exact;

  const normalizedTarget = normalizeExerciseName(trimmed);
  if (!normalizedTarget) return null;

  const all = await Exercise.find({}, "name").lean();
  const dup = all.find(
    (exercise) => normalizeExerciseName(exercise.name) === normalizedTarget,
  );
  return dup || null;
}

module.exports = {
  normalizeExerciseName,
  findDuplicateExerciseByName,
};
