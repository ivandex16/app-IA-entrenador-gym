const Exercise = require('../models/Exercise');

// GET /api/exercises?muscleGroup=chest&difficulty=beginner&equipment=barbell
exports.list = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.muscleGroup) {
      const groups = req.query.muscleGroup.split(',').filter(Boolean);
      filter.muscleGroup = groups.length === 1 ? groups[0] : { $in: groups };
    }
    if (req.query.difficulty) filter.difficulty = req.query.difficulty;
    if (req.query.equipment) filter.equipment = req.query.equipment;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.search)
      filter.name = { $regex: req.query.search, $options: 'i' };

    const exercises = await Exercise.find(filter).sort('muscleGroup name');
    res.json(exercises);
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
