const {
  recommend,
  generateRoutineWithAI,
} = require("../services/recommendationEngine");
const AIRecommendation = require("../models/AIRecommendation");

// GET /api/recommendations?tier=scoring
exports.getRecommendation = async (req, res, next) => {
  try {
    const tier = req.query.tier || "scoring"; // 'rules' | 'scoring' | 'llm'
    const result = await recommend(req.user, tier);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// GET /api/recommendations/history
exports.history = async (req, res, next) => {
  try {
    const recs = await AIRecommendation.find({ user: req.user._id })
      .populate("exercises", "name muscleGroup")
      .sort("-createdAt")
      .limit(20);
    res.json(recs);
  } catch (err) {
    next(err);
  }
};

// PUT /api/recommendations/:id/feedback  { accepted: true|false }
exports.feedback = async (req, res, next) => {
  try {
    const rec = await AIRecommendation.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { accepted: req.body.accepted },
      { new: true },
    );
    if (!rec)
      return res.status(404).json({ message: "Recommendation not found" });
    res.json(rec);
  } catch (err) {
    next(err);
  }
};

// POST /api/recommendations/generate-routine
exports.generateRoutine = async (req, res, next) => {
  try {
    const result = await generateRoutineWithAI(req.user, req.body);
    res.status(201).json(result);
  } catch (err) {
    if (err.message.includes("GEMINI_API_KEY") || err.message.includes("IA")) {
      return res.status(400).json({ message: err.message });
    }
    next(err);
  }
};
