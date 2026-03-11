const { validationResult } = require('express-validator');

/**
 * Middleware that checks express-validator results.
 * Place AFTER the validation chain in route definitions:
 *   router.post('/', [body('email').isEmail()], validate, controller);
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const normalized = errors.array().map((error) => ({
      field: error.path || error.param,
      message: error.msg,
    }));

    return res.status(422).json({
      message: 'Revisa los datos ingresados.',
      errors: normalized,
    });
  }
  next();
};

module.exports = validate;
