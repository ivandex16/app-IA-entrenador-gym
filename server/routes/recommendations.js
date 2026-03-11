const router = require("express").Router();
const { protect } = require("../middleware/auth");
const ctrl = require("../controllers/recommendationController");

router.use(protect);

router.get("/", ctrl.getRecommendation);
router.get("/history", ctrl.history);
router.post("/generate-routine", ctrl.generateRoutine);
router.post("/fit-recipes/plan", ctrl.generateNutritionPlan);
router.post("/fit-recipes/ingredients", ctrl.generateIngredientRecipes);
router.post("/confirm-routine", ctrl.confirmRoutine);
router.put("/:id/feedback", ctrl.feedback);

module.exports = router;
