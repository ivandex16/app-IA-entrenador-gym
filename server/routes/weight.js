const router = require('express').Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/weightController');

router.use(protect);

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/summary', ctrl.summary);
router.delete('/:id', ctrl.remove);

module.exports = router;
