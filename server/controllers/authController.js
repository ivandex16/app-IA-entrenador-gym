const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const { sendEmail, passwordResetEmail } = require("../services/mailer");

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

/* ── Password recovery by email ──
   The reset token travels ONLY in the email (never in the HTTP response), is
   stored as a SHA-256 hash, expires in 30 minutes and works once. The answer is
   the same whether or not the email exists, so it doesn't reveal accounts. */
const RESET_MINUTES = 30;
const FORGOT_RESPONSE = {
  message:
    "Si el correo está registrado, te enviamos un enlace para restablecer la contraseña. Revisa tu bandeja de entrada y el spam.",
};

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

// The link always points to the configured frontend, never to a host taken from
// the request (a spoofed Origin/Host could send the token to someone else's site).
function resetLink(token) {
  const base = (process.env.CLIENT_URL || "").split(",")[0].trim().replace(/\/+$/, "");
  return base ? `${base}/reset-password/${token}` : null;
}

async function sendResetEmail(user) {
  const token = crypto.randomBytes(32).toString("hex");
  const link = resetLink(token);
  if (!link) {
    console.error("[password-reset] CLIENT_URL no está configurado; no se envía el correo");
    return;
  }
  user.resetPasswordToken = hashToken(token);
  user.resetPasswordExpires = Date.now() + RESET_MINUTES * 60 * 1000;
  await user.save({ validateModifiedOnly: true });

  const mail = passwordResetEmail({ name: user.name, link, minutes: RESET_MINUTES });
  const result = await sendEmail({ to: user.email, ...mail });
  if (result.sent) {
    console.log(`[password-reset] correo enviado al usuario ${user._id} vía ${result.provider}`);
  } else {
    // Log why (never the token or the link).
    console.error(
      `[password-reset] no se pudo enviar al usuario ${user._id}` + (result.provider ? ` vía ${result.provider}` : "") + `: ${result.reason}` +
        (result.status ? ` (HTTP ${result.status})` : "") +
        (result.details ? ` ${result.details}` : "")
    );
  }
}

// POST /api/auth/forgot-password   (email validated in routes/auth.js)
exports.forgotPassword = async (req, res) => {
  const email = String(req.body.email).trim().toLowerCase();
  // Answer right away and send in the background, so the response time doesn't
  // reveal whether the account exists either.
  res.json(FORGOT_RESPONSE);
  try {
    const user = await User.findOne({ email });
    if (user) await sendResetEmail(user);
  } catch (err) {
    console.error("[password-reset] error:", err.message);
  }
};

// PUT /api/auth/reset-password/:token   (password validated in routes/auth.js)
exports.resetPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({
      resetPasswordToken: hashToken(req.params.token),
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) {
      return res.status(400).json({
        message: "El enlace no es válido o ya caducó. Solicita uno nuevo.",
      });
    }

    user.password = req.body.password; // hashed by the pre-save hook
    user.resetPasswordToken = undefined; // single use
    user.resetPasswordExpires = undefined;
    await user.save({ validateModifiedOnly: true });

    res.json({ message: "Contraseña restablecida. Ya puedes iniciar sesión." });
  } catch (err) {
    next(err);
  }
};
