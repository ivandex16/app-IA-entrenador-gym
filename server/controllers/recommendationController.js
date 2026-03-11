const {
  recommend,
  generateRoutineWithAI,
  confirmGeneratedRoutine,
} = require("../services/recommendationEngine");
const {
  generateNutritionPlanWithAI,
  generateIngredientRecipesWithAI,
} = require("../services/fitRecipeEngine");
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
    const result = await generateRoutineWithAI(req.user, req.body, {
      persist: false,
    });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// POST /api/recommendations/confirm-routine
exports.confirmRoutine = async (req, res, next) => {
  try {
    const result = await confirmGeneratedRoutine(req.user, req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

// POST /api/recommendations/fit-recipes/plan
exports.generateNutritionPlan = async (req, res, next) => {
  try {
    const plan = await generateNutritionPlanWithAI(req.user, req.body);
    res.status(201).json(plan);
  } catch (err) {
    next(err);
  }
};

// POST /api/recommendations/fit-recipes/ingredients
exports.generateIngredientRecipes = async (req, res, next) => {
  try {
    const recipes = await generateIngredientRecipesWithAI(req.user, req.body);
    res.status(201).json(recipes);
  } catch (err) {
    next(err);
  }
};

