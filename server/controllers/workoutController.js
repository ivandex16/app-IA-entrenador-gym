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

// A date-only bound (YYYY-MM-DD) for 'to' means the whole day is included.
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/workouts?from=2026-01-01&to=2026-01-31   (dates validated in the route)
exports.list = async (req, res, next) => {
  try {
    const filter = { user: req.user._id };
    const { from, to } = req.query;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) {
        if (DATE_ONLY.test(to)) {
          const end = new Date(to);
          end.setUTCDate(end.getUTCDate() + 1);
          filter.date.$lt = end;
        } else {
          filter.date.$lte = new Date(to);
        }
      }
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

/*
 * Whitelist of what a client may set on a workout. Anything else in the body
 * (caloriesBurned, user, createdAt, unknown fields...) is ignored: calories are
 * always computed here. Types and ranges are validated in routes/workouts.js.
 */
const toNumber = (v) => (v === '' || v === null || v === undefined ? 0 : Number(v));

function pickWorkoutFields(body) {
  const data = {};
  if (body.date !== undefined) data.date = body.date;
  if (body.routine) data.routine = body.routine;
  if (body.durationMinutes !== undefined) data.durationMinutes = toNumber(body.durationMinutes);
  if (body.notes !== undefined) data.notes = body.notes;
  if (body.feeling !== undefined) data.feeling = body.feeling;
  if (Array.isArray(body.exercises)) {
    data.exercises = body.exercises.map((e) => ({
      exercise: e.exercise,
      sets: (Array.isArray(e.sets) ? e.sets : []).map((s, i) => ({
        setNumber: toNumber(s.setNumber) || i + 1,
        reps: toNumber(s.reps),
        weight: toNumber(s.weight),
        ...(s.rpe ? { rpe: toNumber(s.rpe) } : {}),
      })),
    }));
  }
  return data;
}

// POST /api/workouts
// Idempotent when the client sends a clientId: repeating the same request
// returns the workout already saved (200) instead of creating a duplicate.
exports.create = async (req, res, next) => {
  const userId = req.user._id;
  const { clientId } = req.body;
  try {
    if (clientId) {
      const existing = await WorkoutLog.findOne({ user: userId, clientId });
      if (existing) return res.status(200).json(existing);
    }
    const data = { ...pickWorkoutFields(req.body), user: userId };
    if (clientId) data.clientId = clientId;
    data.caloriesBurned = data.exercises?.length
      ? await estimateCalories(userId, data.exercises, data.durationMinutes)
      : 0;
    const log = await WorkoutLog.create(data);
    res.status(201).json(log);
  } catch (err) {
    // Two identical requests raced past the lookup: return the one that won.
    if (err.code === 11000 && clientId) {
      const existing = await WorkoutLog.findOne({ user: userId, clientId }).catch(() => null);
      if (existing) return res.status(200).json(existing);
    }
    next(err);
  }
};

// PUT /api/workouts/:id
exports.update = async (req, res, next) => {
  try {
    const log = await WorkoutLog.findOne({ _id: req.params.id, user: req.user._id });
    if (!log) return res.status(404).json({ message: 'Workout not found' });

    const data = pickWorkoutFields(req.body);
    log.set(data);
    // Recompute calories from the merged result whenever what they depend on changed.
    if ('exercises' in data || 'durationMinutes' in data) {
      log.caloriesBurned = log.exercises.length
        ? await estimateCalories(req.user._id, log.exercises, log.durationMinutes)
        : 0;
    }
    await log.save();
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
