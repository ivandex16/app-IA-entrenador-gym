const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

// POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, height, weight } = req.body;
    const userData = { name, email, password };
    if (height) userData.height = height;
    if (weight) userData.weight = weight;
    const user = await User.create(userData);
    const token = signToken(user._id);
    res
      .status(201)
      .json({
        token,
        user: {
          id: user._id,
          name,
          email,
          role: user.role,
          tourCompleted: false,
        },
      });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ message: "Invalid email or password" });

    const token = signToken(user._id);
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email,
        role: user.role,
        tourCompleted: user.tourCompleted,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me  (protected)
exports.getMe = async (req, res) => {
  res.json(req.user);
};

// POST /api/auth/forgot-password
// PUT /api/auth/change-password   (logged-in user; body validated in routes/auth.js)
// A wrong current password answers 400, not 401: the client treats any 401 as an
// expired session and would log the user out.
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select("+password");
    if (!user) return res.status(404).json({ message: "Usuario no encontrado." });

    if (!(await user.comparePassword(currentPassword))) {
      return res.status(400).json({ message: "La contraseña actual no es correcta." });
    }
    if (await user.comparePassword(newPassword)) {
      return res.status(400).json({ message: "La nueva contraseña debe ser distinta de la actual." });
    }

    user.password = newPassword; // hashed by the pre-save hook
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    // Validate only what changed, so older accounts with legacy field values can still save.
    await user.save({ validateModifiedOnly: true });

    res.json({ message: "Contraseña actualizada correctamente." });
  } catch (err) {
    next(err);
  }
};

// Password recovery by email is not available: there is no email delivery, and
// the reset token must never be returned in the HTTP response (anyone knowing an
// email could take over that account). Same answer for every email, so it
// doesn't reveal which ones are registered either.
exports.forgotPassword = async (_req, res) => {
  res.status(503).json({
    message:
      "La recuperación de contraseña por correo no está disponible. Contacta al administrador.",
  });
};

// PUT /api/auth/reset-password/:token
exports.resetPassword = async (req, res, next) => {
  try {
    const hashed = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashed,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user)
      return res.status(400).json({ message: "Invalid or expired token" });

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    const token = signToken(user._id);
    res.json({ token });
  } catch (err) {
    next(err);
  }
};
