const { generateWeeklyReport } = require('../services/weeklyReport');
const WorkoutLog = require('../models/WorkoutLog');
const { LEGACY_COMPLETED_FILTER } = require('../constants/workoutStatus');
const { dayKey, periodRanges, safeTimeZone } = require('../services/progressDates');
const { buildExerciseProgress } = require('../services/exerciseProgress');

const readQuery = (q) => ({
  date: typeof q.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(q.date) ? q.date : new Date(),
  tz: typeof q.tz === "string" ? q.tz.slice(0, 64) : "UTC",
  period: typeof q.period === "string" ? q.period : "week",
});

// GET /api/progress/weekly?tz=America/Bogota&period=week|4w|12w&date=2026-03-07
// (date = a local day, optional; period defaults to the current week)
exports.weeklyReport = async (req, res, next) => {
  try {
    const { date, tz, period } = readQuery(req.query);
    const report = await generateWeeklyReport(req.user._id, date, tz, period);
    res.json(report);
  } catch (err) {
    next(err);
  }
};

// GET /api/progress/exercises?tz=America/Bogota&period=week|4w|12w
// Progress per exercise over the last 12 weeks (status, best set, points for
// the chart) and the personal records set in the selected period.
exports.exercises = async (req, res, next) => {
  try {
    const { date, tz, period } = readQuery(req.query);
    const zone = safeTimeZone(tz);
    const p = periodRanges(period, date, zone);
    // Whole history: a record is a best compared with everything before it.
    const logs = await WorkoutLog.find({ user: req.user._id, ...LEGACY_COMPLETED_FILTER })
      .select('date exercises.exercise exercises.sets.reps exercises.sets.weight exercises.sets.completed')
      .populate('exercises.exercise', 'name muscleGroup')
      .lean();
    const entries = [];
    for (const log of logs) {
      const day = dayKey(log.date, zone);
      for (const e of log.exercises || []) entries.push({ day, exercise: e.exercise, sets: e.sets });
    }
    res.json(buildExerciseProgress(entries, { today: p.today, recordsRange: p.current }));
  } catch (err) {
    next(err);
  }
};
