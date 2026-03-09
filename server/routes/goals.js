const router = require('express').Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/goalController');

router.use(protect);

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.post('/ai-suggest', ctrl.aiSuggest);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
