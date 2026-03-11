const Routine = require('../models/Routine');
const Exercise = require('../models/Exercise');

// GET /api/routines
exports.list = async (req, res, next) => {
  try {
    const routines = await Routine.find({ user: req.user._id })
      .populate('exercises.exercise', 'name muscleGroup')
      .populate('days.exercises.exercise', 'name muscleGroup')
      .sort('-updatedAt');
    res.json(routines);
  } catch (err) {
    next(err);
  }
};

// GET /api/routines/:id
exports.getById = async (req, res, next) => {
  try {
    const routine = await Routine.findOne({
      _id: req.params.id,
      user: req.user._id,
    })
      .populate('exercises.exercise')
      .populate('days.exercises.exercise');
    if (!routine) return res.status(404).json({ message: 'Routine not found' });

    // Auto-migrate legacy flat-exercises routines into days[]
    if ((!routine.days || routine.days.length === 0) && routine.exercises && routine.exercises.length > 0) {
      routine.days = [{ dayLabel: 'Lunes', exercises: routine.exercises }];
      routine.exercises = [];
      await routine.save();
      // Re-populate after save
      await routine.populate('days.exercises.exercise');
    }

    res.json(routine);
  } catch (err) {
    next(err);
  }
};

// POST /api/routines
exports.create = async (req, res, next) => {
  try {
    const routine = await Routine.create({ ...req.body, user: req.user._id });
    res.status(201).json(routine);
  } catch (err) {
    next(err);
  }
};

// PUT /api/routines/:id
exports.update = async (req, res, next) => {
  try {
    const routine = await Routine.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!routine) return res.status(404).json({ message: 'Routine not found' });
    res.json(routine);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/routines/:id
exports.remove = async (req, res, next) => {
  try {
    const routine = await Routine.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!routine) return res.status(404).json({ message: 'Routine not found' });
    res.json({ message: 'Routine deleted' });
  } catch (err) {
    next(err);
  }
};

// POST /api/routines/:id/add-exercise
exports.addExercise = async (req, res, next) => {
  try {
    const {
      exerciseId,
      dayIndex = 0,
      sets = 3,
      repsMin = 8,
      repsMax = 12,
      weight = 0,
      restSeconds = 90,
      notes = '',
    } = req.body || {};

    if (!exerciseId) {
      return res.status(400).json({ message: 'exerciseId es obligatorio' });
    }

    const exercise = await Exercise.findById(exerciseId).select('_id name muscleGroup');
    if (!exercise) {
      return res.status(404).json({ message: 'Exercise not found' });
    }

    const routine = await Routine.findOne({ _id: req.params.id, user: req.user._id });
    if (!routine) return res.status(404).json({ message: 'Routine not found' });

    // Migrate legacy flat routines to days[] if needed.
    if ((!routine.days || routine.days.length === 0) && routine.exercises?.length > 0) {
      routine.days = [{ dayLabel: 'Lunes', exercises: routine.exercises }];
      routine.exercises = [];
    }
    if (!routine.days || routine.days.length === 0) {
      routine.days = [{ dayLabel: 'Lunes', exercises: [] }];
    }

    const idx = Math.max(0, Math.min(Number(dayIndex) || 0, routine.days.length - 1));
    const day = routine.days[idx];
    const alreadyExists = (day.exercises || []).some(
      (e) => String(e.exercise) === String(exercise._id),
    );
    if (alreadyExists) {
      return res.status(409).json({ message: 'Ese ejercicio ya existe en ese dia' });
    }

    day.exercises.push({
      exercise: exercise._id,
      order: day.exercises.length,
      sets: Math.max(1, Number(sets) || 3),
      repsMin: Math.max(1, Number(repsMin) || 8),
      repsMax: Math.max(1, Number(repsMax) || 12),
      weight: Math.max(0, Number(weight) || 0),
      restSeconds: Math.max(15, Number(restSeconds) || 90),
      notes: String(notes || '').slice(0, 250),
    });

    await routine.save();
    await routine.populate('days.exercises.exercise', 'name muscleGroup');

    res.status(201).json({
      message: 'Ejercicio agregado a la rutina',
      routine,
      addedTo: { dayIndex: idx, dayLabel: day.dayLabel, exerciseId: exercise._id },
    });
  } catch (err) {
    next(err);
  }
};
