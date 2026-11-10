/*
 * /api/routines/import/* — routine import from an image (review first, then the
 * normal POST /api/routines). Mounted on its own so routes/routines.js and the
 * PDF upload stay exactly as they were.
 */
const router = require('express').Router();
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const ctrl = require('../controllers/routineImageController');

router.use(protect);

const limiter = rateLimit({ windowMs: 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });

router.post(
  '/image',
  limiter,
  [
    body('lines').isArray({ min: 1, max: 400 }).withMessage('lines must be a list of 1–400 OCR lines'),
    body('lines.*.text').isString().isLength({ max: 300 }).withMessage('each line must be text up to 300 characters'),
    body('lines.*.confidence').optional({ values: 'null' }).isFloat({ min: 0, max: 100 }),
  ],
  validate,
  ctrl.parseImageText
);

router.post(
  '/exercises',
  limiter,
  [
    body('name').isString().trim().isLength({ min: 2, max: 80 }).withMessage('name must be 2–80 characters'),
    body('muscleGroup').isIn(ctrl.MUSCLE_GROUPS).withMessage(`muscleGroup must be one of: ${ctrl.MUSCLE_GROUPS.join(', ')}`),
  ],
  validate,
  ctrl.createExercise
);

module.exports = router;
