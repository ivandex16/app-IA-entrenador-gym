const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/exerciseController');
const { query } = require('express-validator');
const validate = require('../middleware/validate');

router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1, max: 10000 }),
    query('limit').optional().isInt({ min: 1, max: 60 }),
    query('search').optional().isString().isLength({ max: 80 }),
    query('muscleGroup').optional().isString().isLength({ max: 200 }),
    query('exclude').optional().isMongoId(),
  ],
  validate,
  ctrl.list
); // public – browse catalog (paginated when `page` is sent)
router.post('/ai-recommend', protect, ctrl.aiRecommend); // AI exercise recommend
router.get('/:id', ctrl.getById);                 // public – exercise detail

router.use(protect, authorize('admin'));
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
