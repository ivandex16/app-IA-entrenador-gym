const WorkoutLog = require('../models/WorkoutLog');
const User = require('../models/User');
const Exercise = require('../models/Exercise');

// MET estimates by muscle group (metabolic equivalent of task)
const MET_BY_GROUP = {
  chest: 6.0, back: 6.0, shoulders: 5.0, biceps: 4.5, triceps: 4.5,
  legs: 6.5, glutes: 6.0, abs: 4.0, forearms: 3.5, calves: 4.0,
  full_body: 7.0, cardio: 8.0,
};

// Estimate calories: MET × weight(kg) × duration(hours)
async function estimateCalories(userId, exercises, durationMinutes) {
  if (!durationMinutes || durationMinutes <= 0) return 0;
  const user = await User.findById(userId).select('weight');
  const weightKg = user?.weight || 70; // default 70 kg
  const exerciseIds = exercises.map((e) => e.exercise);
  const dbExercises = await Exercise.find({ _id: { $in: exerciseIds } }).select('muscleGroup');
  const mets = dbExercises.map((e) => MET_BY_GROUP[e.muscleGroup] || 5.0);
  const avgMet = mets.length > 0 ? mets.reduce((a, b) => a + b, 0) / mets.length : 5.0;
  return Math.round(avgMet * weightKg * (durationMinutes / 60));
}

// GET /api/workouts?from=2026-01-01&to=2026-01-31
exports.list = async (req, res, next) => {
  try {
    const filter = { user: req.user._id };
    if (req.query.from || req.query.to) {
      filter.date = {};
      if (req.query.from) filter.date.$gte = new Date(req.query.from);
      if (req.query.to) filter.date.$lte = new Date(req.query.to);
    }
    const logs = await WorkoutLog.find(filter)
      .populate('exercises.exercise', 'name muscleGroup')
      .sort('-date');
    res.json(logs);
  } catch (err) {
    next(err);
  }
};

// GET /api/workouts/:id
exports.getById = async (req, res, next) => {
  try {
    const log = await WorkoutLog.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).populate('exercises.exercise');
    if (!log) return res.status(404).json({ message: 'Workout not found' });
    res.json(log);
  } catch (err) {
    next(err);
  }
};

// POST /api/workouts
exports.create = async (req, res, next) => {
  try {
    const data = { ...req.body, user: req.user._id };
    if (data.exercises?.length && data.durationMinutes) {
      data.caloriesBurned = await estimateCalories(req.user._id, data.exercises, data.durationMinutes);
    }
    const log = await WorkoutLog.create(data);
    res.status(201).json(log);
  } catch (err) {
    next(err);
  }
};

// PUT /api/workouts/:id
exports.update = async (req, res, next) => {
  try {
    const data = { ...req.body };
    if (data.exercises?.length && data.durationMinutes) {
      data.caloriesBurned = await estimateCalories(req.user._id, data.exercises, data.durationMinutes);
    }
    const log = await WorkoutLog.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      data,
      { new: true, runValidators: true }
    );
    if (!log) return res.status(404).json({ message: 'Workout not found' });
    res.json(log);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/workouts/:id
exports.remove = async (req, res, next) => {
  try {
    const log = await WorkoutLog.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!log) return res.status(404).json({ message: 'Workout not found' });
    res.json({ message: 'Workout deleted' });
  } catch (err) {
    next(err);
  }
};
