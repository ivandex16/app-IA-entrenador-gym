const router = require("express").Router();
const { protect, authorize } = require("../middleware/auth");
const ctrl = require("../controllers/adminController");

router.use(protect, authorize("admin"));

router.get("/stats", ctrl.getStats);
router.get("/users", ctrl.listUsers);
router.patch("/users/:id/role", ctrl.updateUserRole);
router.delete("/users/:id", ctrl.deleteUser);

module.exports = router;
