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

router.put(
  '/change-password',
  protect,
  [
    body('currentPassword')
      .isString().withMessage('La contraseña actual es obligatoria.')
      .bail()
      .notEmpty().withMessage('La contraseña actual es obligatoria.'),
    body('newPassword')
      .isString().withMessage('La nueva contraseña es obligatoria.')
      .bail()
      // bcrypt only uses the first 72 bytes
      .isLength({ min: 6, max: 72 }).withMessage('La nueva contraseña debe tener entre 6 y 72 caracteres.'),
  ],
  validate,
  ctrl.changePassword
);
router.post('/forgot-password', ctrl.forgotPassword);
router.put('/reset-password/:token', ctrl.resetPassword);

module.exports = router;
