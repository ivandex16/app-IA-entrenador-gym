const { validationResult } = require('express-validator');

/**
 * Middleware that checks express-validator results.
 * Place AFTER the validation chain in route definitions:
 *   router.post('/', [body('email').isEmail()], validate, controller);
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(422).json({ errors: errors.array() });
  next();
};

module.exports = validate;
