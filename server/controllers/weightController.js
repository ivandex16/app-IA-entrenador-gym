const WeightLog = require('../models/WeightLog');
const Goal = require('../models/Goal');

// GET /api/weight — list all weight entries for user (newest first)
exports.list = async (req, res, next) => {
  try {
    const logs = await WeightLog.find({ user: req.user._id }).sort('-date');
    res.json(logs);
  } catch (err) {
    next(err);
  }
};

// POST /api/weight — add a new weight entry
exports.create = async (req, res, next) => {
  try {
    const { weight, date, notes } = req.body;
    const log = await WeightLog.create({
      user: req.user._id,
      weight,
      date: date || new Date(),
      notes,
    });
    res.status(201).json(log);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/weight/:id
exports.remove = async (req, res, next) => {
  try {
    const log = await WeightLog.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!log) return res.status(404).json({ message: 'Weight log not found' });
    res.json({ message: 'Weight log deleted' });
  } catch (err) {
    next(err);
  }
};

// GET /api/weight/summary — weight progress summary tied to active goal
exports.summary = async (req, res, next) => {
  try {
    const logs = await WeightLog.find({ user: req.user._id }).sort('date');
    if (logs.length === 0) {
      return res.json({ logs: [], trend: null, goalProgress: null });
    }

    const activeGoal = await Goal.findOne({
      user: req.user._id,
      isActive: true,
    }).sort('-createdAt');

    const first = logs[0];
    const last = logs[logs.length - 1];
    const trend = {
      startWeight: first.weight,
      currentWeight: last.weight,
      change: +(last.weight - first.weight).toFixed(1),
      entries: logs.length,
    };

    let goalProgress = null;
    if (activeGoal && activeGoal.metrics) {
      const { startWeight, targetWeight } = activeGoal.metrics;
      if (startWeight != null && targetWeight != null) {
        const totalNeeded = targetWeight - startWeight;
        const achieved = last.weight - startWeight;
        const percentage = totalNeeded !== 0
          ? Math.round((achieved / totalNeeded) * 100)
          : 0;
        goalProgress = {
          goalType: activeGoal.type,
          startWeight,
          targetWeight,
          currentWeight: last.weight,
          remaining: +(targetWeight - last.weight).toFixed(1),
          percentage: Math.min(Math.max(percentage, 0), 100),
        };
      }
    }

    res.json({ logs, trend, goalProgress });
  } catch (err) {
    next(err);
  }
};
