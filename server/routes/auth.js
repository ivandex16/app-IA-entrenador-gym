const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/authController');

router.post(
  '/register',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
  ],
  validate,
  ctrl.register
);

router.post(
  '/login',
  [
    body('email').isEmail(),
    body('password').notEmpty(),
  ],
  validate,
  ctrl.login
);

router.get('/me', protect, ctrl.getMe);
router.post('/forgot-password', ctrl.forgotPassword);
router.put('/reset-password/:token', ctrl.resetPassword);

module.exports = router;
