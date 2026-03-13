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
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: "Ese correo ya esta registrado." });
    }

    const userData = {
      name,
      email: normalizedEmail,
      password,
      emailVerified: true,
    };
    if (height) userData.height = height;
    if (weight) userData.weight = weight;
    const user = await User.create(userData);

    res.status(201).json({
      message: "Cuenta creada correctamente.",
      email: user.email,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: 'Debes ingresar correo y contrasena.' });
    }

    const user = await User.findOne({ email: normalizedEmail }).select("+password");
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ message: 'Correo o contrasena incorrectos.' });
    const token = signToken(user._id);
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        tourCompleted: user.tourCompleted,
        emailVerified: user.emailVerified,
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

// GET /api/auth/verify-email/:token
exports.verifyEmail = async (req, res, next) => {
  try {
    res.json({ message: "La verificacion de correo ya no es requerida." });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/resend-verification
exports.resendVerification = async (req, res, next) => {
  try {
    res.json({ message: "La verificacion de correo ya no es requerida." });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res, next) => {
  try {
    return res.status(503).json({
      message:
        "La recuperacion por correo no esta disponible. Inicia sesion y cambia tu contrasena desde tu perfil.",
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/auth/reset-password/:token
exports.resetPassword = async (req, res, next) => {
  try {
    const newPassword = String(req.body?.password || "");
    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "La contrasena debe tener al menos 6 caracteres." });
    }

    const hashed = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashed,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user)
      return res.status(400).json({ message: "Token invalido o expirado." });

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    const token = signToken(user._id);
    res.json({ token });
  } catch (err) {
    next(err);
  }
};

// PUT /api/auth/change-password
exports.changePassword = async (req, res, next) => {
  try {
    const currentPassword = String(req.body?.currentPassword || "");
    const newPassword = String(req.body?.newPassword || "");

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Debes ingresar tu contrasena actual y la nueva contrasena.",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "La contrasena debe tener al menos 6 caracteres.",
      });
    }

    const user = await User.findById(req.user._id).select("+password");
    if (!user || !(await user.comparePassword(currentPassword))) {
      return res.status(401).json({
        message: "La contrasena actual no es correcta.",
      });
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "Contrasena actualizada correctamente." });
  } catch (err) {
    next(err);
  }
};
