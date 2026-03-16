const router = require("express").Router();
const { protect, authorize } = require("../middleware/auth");
const ctrl = require("../controllers/coachingController");

router.use(protect, authorize("trainer", "admin"));

router.get("/overview", ctrl.getOverview);
router.get("/clients", ctrl.listClients);
router.get("/assignments", ctrl.listAssignments);
router.get("/clients/:id/progress", ctrl.getClientProgress);
router.post("/assignments", ctrl.createAssignment);
router.post("/assignments/:id/comments", ctrl.addComment);
router.patch("/assignments/:id/status", ctrl.updateAssignmentStatus);
router.patch("/assignments/:id/reminder", ctrl.updateReminder);

router.get("/trainers", authorize("admin"), ctrl.listTrainers);

module.exports = router;
