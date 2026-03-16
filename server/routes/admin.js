const router = require("express").Router();
const { protect, authorize } = require("../middleware/auth");
const ctrl = require("../controllers/adminController");

router.use(protect, authorize("admin"));

router.get("/stats", ctrl.getStats);
router.get("/users", ctrl.listUsers);
router.post("/seed-exercises", ctrl.seedExercisesCatalog);
router.post("/fill-exercise-videos", ctrl.fillExerciseVideos);
router.patch("/users/:id/role", ctrl.updateUserRole);
router.patch("/users/:id/trainer", ctrl.assignTrainer);
router.post("/users/:id/temp-password", ctrl.setTemporaryPassword);
router.delete("/users/:id", ctrl.deleteUser);

module.exports = router;
