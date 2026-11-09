const router = require('express').Router();
const { body, param, query } = require('express-validator');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const ctrl = require('../controllers/workoutController');

router.use(protect);

// Numbers may arrive as strings from inputs ("62.5", "" while editing): accept
// empty (treated as 0 by the controller) or a finite number within range.
const numberInRange = (min, max) => (value) => {
  if (value === '' || value === null || value === undefined) return true;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) throw new Error(`must be a number between ${min} and ${max}`);
  return true;
};

const idParam = [param('id').isMongoId().withMessage('Invalid workout id')];

const workoutBody = [
  body('date').optional().isISO8601().withMessage('date must be an ISO date'),
  body('routine').optional({ values: 'falsy' }).isMongoId(),
  body('durationMinutes').optional().custom(numberInRange(0, 1440)),
  body('notes').optional().isString().isLength({ max: 2000 }),
  body('feeling').optional().isIn(['great', 'good', 'ok', 'tired', 'bad']),
  body('favorite').optional().isBoolean({ strict: true }).withMessage('favorite must be true or false'),
  body('exercises').optional().isArray({ max: 50 }),
  body('exercises.*.exercise').isMongoId().withMessage('exercise must be a valid id'),
  body('exercises.*.sets').optional().isArray({ max: 100 }),
  body('exercises.*.sets.*.setNumber').optional().custom(numberInRange(1, 100)),
  body('exercises.*.sets.*.reps').optional().custom(numberInRange(0, 1000)),
  body('exercises.*.sets.*.weight').optional().custom(numberInRange(0, 2000)),
  body('exercises.*.sets.*.rpe').optional({ values: 'falsy' }).custom(numberInRange(1, 10)),
];

router.get(
  '/',
  [
    query('from').optional().isISO8601().withMessage('from must be an ISO date'),
    query('to').optional().isISO8601().withMessage('to must be an ISO date'),
  ],
  validate,
  ctrl.list
);
router.get('/:id', idParam, validate, ctrl.getById);
router.post(
  '/',
  [
    ...workoutBody,
    body('clientId').optional().isString().matches(/^[\w-]{8,64}$/).withMessage('Invalid clientId'),
  ],
  validate,
  ctrl.create
);
router.put('/:id', [...idParam, ...workoutBody], validate, ctrl.update);
router.delete('/:id', idParam, validate, ctrl.remove);

module.exports = router;
