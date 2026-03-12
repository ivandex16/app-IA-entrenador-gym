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
    body('email')
      .trim()
      .notEmpty()
      .withMessage('El correo es obligatorio.')
      .bail()
      .isEmail()
      .withMessage('Ingresa un correo valido.'),
    body('password')
      .notEmpty()
      .withMessage('La contrasena es obligatoria.')
      .bail()
      .isLength({ min: 6 })
      .withMessage('La contrasena debe tener al menos 6 caracteres.'),
  ],
  validate,
  ctrl.login
);

router.get('/me', protect, ctrl.getMe);
router.get('/verify-email/:token', ctrl.verifyEmail);
router.post(
  '/resend-verification',
  [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('El correo es obligatorio.')
      .bail()
      .isEmail()
      .withMessage('Ingresa un correo valido.'),
  ],
  validate,
  ctrl.resendVerification
);
router.post(
  '/forgot-password',
  [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('El correo es obligatorio.')
      .bail()
      .isEmail()
      .withMessage('Ingresa un correo valido.'),
  ],
  validate,
  ctrl.forgotPassword
);
router.put(
  '/reset-password/:token',
  [
    body('password')
      .notEmpty()
      .withMessage('La contrasena es obligatoria.')
      .bail()
      .isLength({ min: 6 })
      .withMessage('La contrasena debe tener al menos 6 caracteres.'),
  ],
  validate,
  ctrl.resetPassword
);

module.exports = router;
