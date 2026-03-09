const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/exerciseController');

router.get('/', ctrl.list);          // public – browse catalog
router.get('/:id', ctrl.getById);    // public – exercise detail

router.use(protect, authorize('admin'));
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
