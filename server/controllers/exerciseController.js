const Exercise = require("../models/Exercise");
const {
  aiExerciseRecommend,
  aiExerciseSuggestOpen,
} = require("../services/recommendationEngine");
const {
  findDuplicateExerciseByName,
  normalizeExerciseName,
} = require("../utils/exerciseName");

const MUSCLE_GROUPS = new Set([
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "legs",
  "glutes",
  "abs",
  "forearms",
  "calves",
  "full_body",
  "cardio",
]);
const DIFFICULTIES = new Set(["beginner", "intermediate", "advanced"]);
const EQUIPMENT = new Set([
  "barbell",
  "dumbbell",
  "machine",
  "cable",
  "bodyweight",
  "kettlebell",
  "band",
  "other",
]);
const CATEGORIES = new Set([
  "strength",
  "hypertrophy",
  "endurance",
  "power",
  "flexibility",
]);

const pickValid = (value, allowed, fallback) =>
  allowed.has(value) ? value : fallback;
const toSlug = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

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

// GET /api/exercises?muscleGroup=chest&difficulty=beginner&equipment=barbell
exports.list = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.muscleGroup) {
      const groups = req.query.muscleGroup.split(",").filter(Boolean);
      filter.muscleGroup = groups.length === 1 ? groups[0] : { $in: groups };
    }
    if (req.query.difficulty) filter.difficulty = req.query.difficulty;
    if (req.query.equipment) filter.equipment = req.query.equipment;
    if (req.query.category) filter.category = req.query.category;
    const search = String(req.query.search || "").trim();
    let exercises = await Exercise.find(filter).sort({ name: 1 });

    if (search) {
      const normalizedSearch = normalizeExerciseName(search);
      exercises = exercises.filter((exercise) => {
        const normalizedName = normalizeExerciseName(exercise.name);
        return normalizedName.includes(normalizedSearch);
      });
    }

    res.json(exercises);
  } catch (err) {
    next(err);
  }
};

// POST /api/exercises/custom  (protected)
exports.createCustom = async (req, res, next) => {
  try {
    const rawName = String(req.body?.name || "").trim();
    if (!rawName) {
      return res.status(400).json({ message: "El nombre del ejercicio es obligatorio" });
    }

    const existing = await findDuplicateExerciseByName(rawName);
    if (existing) {
      return res.status(200).json({
        message: "El ejercicio ya existe en el catalogo",
        created: false,
        exercise: existing,
      });
    }

    const muscleGroup = pickValid(
      toSlug(req.body?.muscleGroup),
      MUSCLE_GROUPS,
      "full_body",
    );
    const difficulty = pickValid(
      toSlug(req.body?.difficulty),
      DIFFICULTIES,
      "intermediate",
    );
    const equipment = pickValid(
      toSlug(req.body?.equipment),
      EQUIPMENT,
      "other",
    );
    const category = pickValid(
      toSlug(req.body?.category),
      CATEGORIES,
      "hypertrophy",
    );

    const exercise = await Exercise.create({
      name: rawName,
      description: String(req.body?.description || "").trim(),
      muscleGroup,
      difficulty,
      equipment,
      category,
      imageUrl: String(req.body?.imageUrl || "").trim(),
      videoUrl: String(req.body?.videoUrl || "").trim(),
      instructions: Array.isArray(req.body?.instructions)
        ? req.body.instructions.filter(Boolean).slice(0, 10)
        : [],
      tips: Array.isArray(req.body?.tips)
        ? req.body.tips.filter(Boolean).slice(0, 8)
        : [],
      isUserCreated: true,
      createdBy: req.user._id,
    });

    res.status(201).json({
      message: "Ejercicio agregado al catalogo",
      created: true,
      exercise,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/exercises/ai-suggest-open  (public)
exports.aiSuggestOpen = async (req, res, next) => {
  try {
    const { query } = req.body;
    if (!query || !query.trim()) {
      return res
        .status(400)
        .json({ message: "Debes escribir que tipo de ejercicios buscas" });
    }
    const result = await aiExerciseSuggestOpen(req.user || null, query.trim());
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// GET /api/exercises/:id
exports.getById = async (req, res, next) => {
  try {
    const ex = await Exercise.findById(req.params.id);
    if (!ex) return res.status(404).json({ message: 'Exercise not found' });
    res.json(ex);
  } catch (err) {
    next(err);
  }
};

// POST /api/exercises  (admin)
exports.create = async (req, res, next) => {
  try {
    const existing = await findDuplicateExerciseByName(req.body?.name);
    if (existing) {
      return res.status(409).json({
        message: "Ya existe un ejercicio con ese nombre",
        exercise: existing,
      });
    }
    const ex = await Exercise.create(req.body);
    res.status(201).json(ex);
  } catch (err) {
    next(err);
  }
};

// PUT /api/exercises/:id  (admin)
exports.update = async (req, res, next) => {
  try {
    if (req.body?.name) {
      const existing = await findDuplicateExerciseByName(req.body.name);
      if (existing && String(existing._id) !== String(req.params.id)) {
        return res.status(409).json({
          message: "Ya existe un ejercicio con ese nombre",
          exercise: existing,
        });
      }
    }
    const ex = await Exercise.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!ex) return res.status(404).json({ message: 'Exercise not found' });
    res.json(ex);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/exercises/:id  (admin)
exports.remove = async (req, res, next) => {
  try {
    const ex = await Exercise.findByIdAndDelete(req.params.id);
    if (!ex) return res.status(404).json({ message: 'Exercise not found' });
    res.json({ message: 'Exercise deleted' });
  } catch (err) {
    next(err);
  }
};
