const router = require('express').Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/routineController');
const pdfCtrl = require('../controllers/pdfController');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

router.use(protect);

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
// A new routine arrives complete (name + days with exercises) in one request:
// nothing is stored while the user is still building it, and no empty routine is created.
const range = (min, max) => (v) => {
  if (v === undefined || v === null || v === '') return true;
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) throw new Error(`debe estar entre ${min} y ${max}`);
  return true;
};
router.post(
  '/',
  [
    body('name').isString().trim().isLength({ min: 1, max: 100 }).withMessage('El nombre es obligatorio (máx. 100 caracteres)'),
    body('description').optional().isString().isLength({ max: 1000 }),
    body('goal').optional().isIn(ctrl.GOALS),
    body('days').isArray({ min: 1, max: 14 }).withMessage('La rutina necesita al menos un día'),
    body('days.*.dayLabel').optional().isString().isLength({ max: 60 }),
    body('days.*.exercises').isArray({ min: 1, max: 40 }).withMessage('Cada día necesita al menos un ejercicio'),
    body('days.*.exercises.*.exercise').isMongoId().withMessage('Ejercicio no válido'),
    body('days.*.exercises.*.sets').custom(range(1, 20)),
    body('days.*.exercises.*.repsMin').custom(range(1, 200)),
    body('days.*.exercises.*.repsMax').custom(range(1, 200)),
    body('days.*.exercises.*.weight').optional().custom(range(0, 1000)),
    body('days.*.exercises.*.restSeconds').optional().custom(range(0, 1800)),
    body('days.*.exercises.*.notes').optional().isString().isLength({ max: 500 }),
  ],
  validate,
  ctrl.create
);
router.post('/upload-pdf', pdfCtrl.uploadMiddleware, pdfCtrl.uploadPdf);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
