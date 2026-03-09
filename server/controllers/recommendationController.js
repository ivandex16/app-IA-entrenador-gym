const {
  recommend,
  generateRoutineWithAI,
  saveAIRoutine,
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
    next(err);
  }
};

// POST /api/recommendations/confirm-routine
exports.confirmRoutine = async (req, res, next) => {
  try {
    // TODO: Implement logic to confirm a generated routine (save to user, etc)
    res.json({ message: 'Rutina confirmada (mock)' });
  } catch (err) {
    next(err);
  }
};

// Add any additional admin/AI endpoints here
    const result = await generateRoutineWithAI(req.user, req.body);
    res.json(result);
>>>>>>> 319b4ba (Initial project import: AI gym trainer app (backend, frontend, seed, AI logic, Docker, docs))
  } catch (err) {
    if (err.message.includes("GEMINI_API_KEY") || err.message.includes("IA")) {
      return res.status(400).json({ message: err.message });
    }
    next(err);
  }
};
<<<<<<< HEAD
=======

// POST /api/recommendations/confirm-routine  (save previewed routine)
exports.confirmRoutine = async (req, res, next) => {
  try {
    const { routineData, goalType, engine } = req.body;
    if (!routineData || !routineData.days) {
      return res
        .status(400)
        .json({ message: "No hay datos de rutina para confirmar" });
    }
    const result = await saveAIRoutine(req.user, {
      routineData,
      goalType,
      engine,
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};
>>>>>>> 319b4ba (Initial project import: AI gym trainer app (backend, frontend, seed, AI logic, Docker, docs))
