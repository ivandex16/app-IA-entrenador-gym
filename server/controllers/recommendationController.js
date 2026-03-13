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
const SavedFitRecipe = require("../models/SavedFitRecipe");

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

// GET /api/recommendations/fit-recipes/saved
exports.listSavedFitRecipes = async (req, res, next) => {
  try {
    const recipes = await SavedFitRecipe.find({ user: req.user._id })
      .sort("-createdAt")
      .limit(50);
    res.json(recipes);
  } catch (err) {
    next(err);
  }
};

// POST /api/recommendations/fit-recipes/save
exports.saveFitRecipe = async (req, res, next) => {
  try {
    const payload = req.body || {};
    const mode = payload.mode === "ingredients" ? "ingredients" : "plan";
    const objective = payload.objective || "fitness_general";
    const mealType = payload.mealType || "all";
    const isWeekly = Boolean(payload.isWeekly);
    const title =
      String(payload.title || "").trim()
      || `${mode === "ingredients" ? "Recetas IA" : "Plan IA"} - ${objective}`;

    const saved = await SavedFitRecipe.create({
      user: req.user._id,
      title,
      mode,
      objective,
      mealType,
      isWeekly,
      engine: payload.engine || "fallback",
      disclaimer: payload.disclaimer || "",
      requestSnapshot: payload.requestSnapshot || {},
      meals: Array.isArray(payload.meals) ? payload.meals : [],
      weeklyPlan: Array.isArray(payload.weeklyPlan) ? payload.weeklyPlan : [],
      generalTips: Array.isArray(payload.generalTips) ? payload.generalTips : [],
      hydrationTips: Array.isArray(payload.hydrationTips) ? payload.hydrationTips : [],
    });

    res.status(201).json(saved);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/recommendations/fit-recipes/saved/:id
exports.deleteSavedFitRecipe = async (req, res, next) => {
  try {
    const saved = await SavedFitRecipe.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!saved) {
      return res.status(404).json({ message: "Receta guardada no encontrada" });
    }
    res.json({ message: "Receta guardada eliminada" });
  } catch (err) {
    next(err);
  }
};

