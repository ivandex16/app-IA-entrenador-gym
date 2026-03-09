const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Protect routes – verify JWT from Authorization header.
 * Attaches `req.user` (full Mongoose doc without password).
 */
const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer '))
      return res.status(401).json({ message: 'Not authorized – no token' });

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user)
      return res.status(401).json({ message: 'User no longer exists' });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Not authorized – invalid token' });
  }
};

/**
 * Restrict to specific roles. Usage: `authorize('admin')`
 */
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return res.status(403).json({ message: 'Forbidden – insufficient role' });
  next();
};

module.exports = { protect, authorize };
