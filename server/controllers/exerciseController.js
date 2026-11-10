const Exercise = require("../models/Exercise");
const { aiExerciseRecommend } = require("../services/recommendationEngine");

// POST /api/exercises/ai-recommend  (protected)
exports.aiRecommend = async (req, res, next) => {
  try {
    const { query } = req.body;
    if (!query || !query.trim()) {
      return res
        .status(400)
        .json({ message: "Debes escribir qué tipo de ejercicios buscas" });
    }
    const result = await aiExerciseRecommend(req.user, query.trim());
    res.json(result);
  } catch (err) {
    next(err);
  }
};

/* Search text → accent/case-insensitive regex source ("jalon" finds "Jalón"), user input escaped. */
const ACCENTS = { a: "[aáàä]", e: "[eéèë]", i: "[iíìï]", o: "[oóòö]", u: "[uúùü]", n: "[nñ]", c: "[cç]" };
function searchRegex(text) {
  return String(text)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 6)
    .map((word) =>
      word
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        .replace(/[aeiounc]/gi, (ch) => ACCENTS[ch.toLowerCase()] || ch)
    )
    // every word, in any order
    .map((w) => `(?=.*${w})`)
    .join("");
}

// Light fields for lists and pickers (no long texts, credits or aliases).
const LIST_FIELDS = "name muscleGroup secondaryMuscles equipment difficulty category description imageUrl thumbnailUrl youtubeVideoId source.provider";

/*
 * GET /api/exercises?muscleGroup=chest,back&equipment=barbell&difficulty=…&category=…&search=…
 *   - without `page`: the full array, as before (Workouts, imports and other callers).
 *   - with `page` (and optional `limit`, max 60): { items, total, page, limit, totalPages }
 *     with light fields — the catalog views page through the server instead of
 *     downloading every exercise.
 */
exports.list = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.muscleGroup) {
      const groups = String(req.query.muscleGroup).split(",").filter(Boolean);
      filter.muscleGroup = groups.length === 1 ? groups[0] : { $in: groups };
    }
    if (req.query.difficulty) filter.difficulty = String(req.query.difficulty);
    if (req.query.equipment) filter.equipment = String(req.query.equipment);
    if (req.query.category) filter.category = String(req.query.category);
    if (req.query.search && String(req.query.search).trim()) {
      const re = { $regex: searchRegex(req.query.search), $options: "i" };
      filter.$or = [{ name: re }, { aliases: re }];
    }
    if (req.query.exclude) filter._id = { $ne: String(req.query.exclude) };

    if (req.query.page === undefined) {
      const exercises = await Exercise.find(filter).sort("muscleGroup name");
      return res.json(exercises);
    }

    const limit = Math.min(60, Math.max(1, parseInt(req.query.limit, 10) || 24));
    const total = await Exercise.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const page = Math.min(totalPages, Math.max(1, parseInt(req.query.page, 10) || 1));
    const items = await Exercise.find(filter)
      .select(LIST_FIELDS)
      // Best documented first: the original catalog (curated, with videos), then
      // imported exercises with a picture, then the rest; alphabetical inside.
      .sort({ "source.provider": 1, imageUrl: -1, muscleGroup: 1, name: 1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    res.json({ items, total, page, limit, totalPages });
  } catch (err) {
    next(err);
  }
};

// GET /api/exercises/:id
exports.getById = async (req, res, next) => {
  try {
    const ex = await Exercise.findById(req.params.id);
    if (!ex) return res.status(404).json({ message: "Exercise not found" });
    res.json(ex);
  } catch (err) {
    next(err);
  }
};

// POST /api/exercises  (admin)
exports.create = async (req, res, next) => {
  try {
    const ex = await Exercise.create(req.body);
    res.status(201).json(ex);
  } catch (err) {
    next(err);
  }
};

// PUT /api/exercises/:id  (admin)
exports.update = async (req, res, next) => {
  try {
    const ex = await Exercise.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!ex) return res.status(404).json({ message: "Exercise not found" });
    res.json(ex);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/exercises/:id  (admin)
exports.remove = async (req, res, next) => {
  try {
    const ex = await Exercise.findByIdAndDelete(req.params.id);
    if (!ex) return res.status(404).json({ message: "Exercise not found" });
    res.json({ message: "Exercise deleted" });
  } catch (err) {
    next(err);
  }
};
