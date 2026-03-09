<<<<<<< HEAD
const router = require("express").Router();
const { protect, authorize } = require("../middleware/auth");
const ctrl = require("../controllers/exerciseController");

router.get("/", ctrl.list); // public – browse catalog
router.post("/ai-recommend", protect, ctrl.aiRecommend); // AI exercise recommend
router.get("/:id", ctrl.getById); // public – exercise detail

router.use(protect, authorize("admin"));
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);
=======
const router = require("express").Router();
const { protect, authorize } = require("../middleware/auth");
const ctrl = require("../controllers/exerciseController");

router.get("/", ctrl.list); // public – browse catalog
router.post("/ai-recommend", protect, ctrl.aiRecommend); // AI exercise recommend
router.get("/:id", ctrl.getById); // public – exercise detail

router.use(protect, authorize("admin"));
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);
>>>>>>> 319b4ba (Initial project import: AI gym trainer app (backend, frontend, seed, AI logic, Docker, docs))

module.exports = router;
