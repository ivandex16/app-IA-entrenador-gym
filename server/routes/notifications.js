const router = require("express").Router();
const { protect } = require("../middleware/auth");
const ctrl = require("../controllers/notificationController");

router.use(protect);

router.get("/", ctrl.listMine);
router.patch("/read-all", ctrl.markAllAsRead);
router.patch("/:id/read", ctrl.markAsRead);

module.exports = router;
