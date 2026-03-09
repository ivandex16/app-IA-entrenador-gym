const Routine = require('../models/Routine');

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
