<<<<<<< HEAD
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
=======
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
>>>>>>> 319b4ba (Initial project import: AI gym trainer app (backend, frontend, seed, AI logic, Docker, docs))

// GET /api/exercises?muscleGroup=chest&difficulty=beginner&equipment=barbell
exports.list = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.muscleGroup) {
<<<<<<< HEAD
      const groups = req.query.muscleGroup.split(",").filter(Boolean);
=======
      const groups = req.query.muscleGroup.split(",").filter(Boolean);
>>>>>>> 319b4ba (Initial project import: AI gym trainer app (backend, frontend, seed, AI logic, Docker, docs))
      filter.muscleGroup = groups.length === 1 ? groups[0] : { $in: groups };
    }
    if (req.query.difficulty) filter.difficulty = req.query.difficulty;
    if (req.query.equipment) filter.equipment = req.query.equipment;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.search)
<<<<<<< HEAD
      filter.name = { $regex: req.query.search, $options: "i" };

    const exercises = await Exercise.find(filter).sort("muscleGroup name");
=======
      filter.name = { $regex: req.query.search, $options: "i" };

    const exercises = await Exercise.find(filter).sort("muscleGroup name");
>>>>>>> 319b4ba (Initial project import: AI gym trainer app (backend, frontend, seed, AI logic, Docker, docs))
    res.json(exercises);
  } catch (err) {
    next(err);
  }
};

// GET /api/exercises/:id
exports.getById = async (req, res, next) => {
  try {
    const ex = await Exercise.findById(req.params.id);
<<<<<<< HEAD
    if (!ex) return res.status(404).json({ message: 'Exercise not found' });
=======
    if (!ex) return res.status(404).json({ message: "Exercise not found" });
>>>>>>> 319b4ba (Initial project import: AI gym trainer app (backend, frontend, seed, AI logic, Docker, docs))
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
<<<<<<< HEAD
    if (!ex) return res.status(404).json({ message: 'Exercise not found' });
=======
    if (!ex) return res.status(404).json({ message: "Exercise not found" });
>>>>>>> 319b4ba (Initial project import: AI gym trainer app (backend, frontend, seed, AI logic, Docker, docs))
    res.json(ex);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/exercises/:id  (admin)
exports.remove = async (req, res, next) => {
  try {
    const ex = await Exercise.findByIdAndDelete(req.params.id);
<<<<<<< HEAD
    if (!ex) return res.status(404).json({ message: 'Exercise not found' });
    res.json({ message: 'Exercise deleted' });
=======
    if (!ex) return res.status(404).json({ message: "Exercise not found" });
    res.json({ message: "Exercise deleted" });
>>>>>>> 319b4ba (Initial project import: AI gym trainer app (backend, frontend, seed, AI logic, Docker, docs))
  } catch (err) {
    next(err);
  }
};
