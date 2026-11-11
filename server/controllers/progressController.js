const { generateWeeklyReport } = require('../services/weeklyReport');

// GET /api/progress/weekly?tz=America/Bogota&period=week|4w|12w&date=2026-03-07
// (date = a local day, optional; period defaults to the current week)
exports.weeklyReport = async (req, res, next) => {
  try {
    const date = typeof req.query.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date) ? req.query.date : new Date();
    const tz = typeof req.query.tz === "string" ? req.query.tz.slice(0, 64) : "UTC";
    const period = typeof req.query.period === "string" ? req.query.period : "week";
    const report = await generateWeeklyReport(req.user._id, date, tz, period);
    res.json(report);
  } catch (err) {
    next(err);
  }
};
