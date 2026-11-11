const router = require('express').Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/progressController');

router.use(protect);

router.get('/weekly', ctrl.weeklyReport);
router.get('/exercises', ctrl.exercises);
router.get('/consistency', ctrl.consistency);

module.exports = router;
