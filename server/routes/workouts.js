const router = require('express').Router();
const { body, param, query } = require('express-validator');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const ctrl = require('../controllers/workoutController');
const { ALL_STATUSES } = require('../constants/workoutStatus');

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
  body('status').optional().isIn(ALL_STATUSES).withMessage(`status must be one of: ${ALL_STATUSES.join(', ')}`),
  body('startedAt').optional({ values: 'null' }).isISO8601().withMessage('startedAt must be an ISO date'),
  body('endedAt').optional({ values: 'null' }).isISO8601().withMessage('endedAt must be an ISO date'),
  body('activeSeconds').optional().custom(numberInRange(0, 86400)),
  body('exercises').optional().isArray({ max: 50 }),
  body('exercises.*.exercise').isMongoId().withMessage('exercise must be a valid id'),
  body('exercises.*.restSeconds').optional({ values: 'null' }).custom(numberInRange(0, 1800)),
  body('exercises.*.sets').optional().isArray({ max: 100 }),
  body('exercises.*.sets.*.setNumber').optional().custom(numberInRange(1, 100)),
  body('exercises.*.sets.*.reps').optional().custom(numberInRange(0, 1000)),
  body('exercises.*.sets.*.weight').optional().custom(numberInRange(0, 2000)),
  body('exercises.*.sets.*.rpe').optional({ values: 'falsy' }).custom(numberInRange(1, 10)),
  body('exercises.*.sets.*.completed').optional().isBoolean({ strict: true }),
  body('exercises.*.sets.*.restSeconds').optional({ values: 'null' }).custom(numberInRange(0, 1800)),
];

router.get(
  '/',
  [
    query('from').optional().isISO8601().withMessage('from must be an ISO date'),
    query('to').optional().isISO8601().withMessage('to must be an ISO date'),
    query('status').optional().custom((v) => String(v).split(',').every((s) => ALL_STATUSES.includes(s))),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be 1-100'),
    query('cursor').optional().isString().isLength({ max: 200 }),
  ],
  validate,
  ctrl.list
);
router.get('/summary', [query('tz').optional().isString().isLength({ max: 64 })], validate, ctrl.summary);
router.get(
  '/last-sets',
  [
    query('exercises').isString().isLength({ min: 1, max: 1000 }),
    query('before').optional().isISO8601(),
    query('exclude').optional().isMongoId(),
  ],
  validate,
  ctrl.lastSets
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
