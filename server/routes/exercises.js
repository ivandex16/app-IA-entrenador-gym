const router = require("express").Router();
const { protect, authorize } = require("../middleware/auth");
const ctrl = require("../controllers/exerciseController");

router.get("/", ctrl.list);
router.post("/ai-suggest-open", ctrl.aiSuggestOpen);
router.post("/ai-recommend", protect, ctrl.aiRecommend);
router.post("/custom", protect, ctrl.createCustom);
router.get("/:id", ctrl.getById);

router.use(protect, authorize("admin"));
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);

module.exports = router;
