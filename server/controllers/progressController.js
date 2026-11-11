const { generateWeeklyReport } = require('../services/weeklyReport');

// GET /api/progress/weekly?tz=America/Bogota&date=2026-03-07 (date = a local day, optional)
exports.weeklyReport = async (req, res, next) => {
  try {
    const date = typeof req.query.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date) ? req.query.date : new Date();
    const tz = typeof req.query.tz === "string" ? req.query.tz.slice(0, 64) : "UTC";
    const report = await generateWeeklyReport(req.user._id, date, tz);
    res.json(report);
  } catch (err) {
    next(err);
  }
};
