const { generateWeeklyReport } = require('../services/weeklyReport');

// GET /api/progress/weekly?date=2026-03-07
exports.weeklyReport = async (req, res, next) => {
  try {
    const refDate = req.query.date ? new Date(req.query.date) : new Date();
    const report = await generateWeeklyReport(req.user._id, refDate);
    res.json(report);
  } catch (err) {
    next(err);
  }
};
