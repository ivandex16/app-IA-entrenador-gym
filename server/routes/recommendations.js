const router = require("express").Router();
const { protect } = require("../middleware/auth");
const ctrl = require("../controllers/recommendationController");

router.use(protect);

router.get("/", ctrl.getRecommendation);
router.get("/history", ctrl.history);
router.post("/generate-routine", ctrl.generateRoutine);
router.get("/fit-recipes/saved", ctrl.listSavedFitRecipes);
router.post("/fit-recipes/plan", ctrl.generateNutritionPlan);
router.post("/fit-recipes/ingredients", ctrl.generateIngredientRecipes);
router.post("/fit-recipes/save", ctrl.saveFitRecipe);
router.delete("/fit-recipes/saved/:id", ctrl.deleteSavedFitRecipe);
router.post("/confirm-routine", ctrl.confirmRoutine);
router.put("/:id/feedback", ctrl.feedback);

module.exports = router;
