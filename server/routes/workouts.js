const router = require('express').Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/workoutController');

router.use(protect);

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
