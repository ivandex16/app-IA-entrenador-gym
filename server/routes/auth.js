const router = require('express').Router();
const { body, param } = require('express-validator');
const { rateLimit } = require('express-rate-limit');
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
// Limits reset emails per IP so the endpoint can't be used to spam inboxes.
const forgotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiadas solicitudes. Inténtalo de nuevo en unos minutos.' },
});

router.post(
  '/forgot-password',
  forgotLimiter,
  [body('email').isEmail().withMessage('Introduce un correo válido.')],
  validate,
  ctrl.forgotPassword
);

router.put(
  '/reset-password/:token',
  [
    param('token').isHexadecimal().isLength({ min: 64, max: 64 }).withMessage('El enlace no es válido.'),
    body('password')
      .isString().withMessage('La nueva contraseña es obligatoria.')
      .bail()
      .isLength({ min: 6, max: 72 }).withMessage('La nueva contraseña debe tener entre 6 y 72 caracteres.'),
  ],
  validate,
  ctrl.resetPassword
);

module.exports = router;
