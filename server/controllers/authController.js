const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const { validateEmailReal } = require("../services/emailValidationService");
const { sendEmail } = require("../services/mailerService");

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

const buildVerificationToken = () => crypto.randomBytes(32).toString("hex");
const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");
const getClientUrl = () => process.env.CLIENT_URL || "http://localhost:5173";

function logMailFailure(context, mailResult) {
  console.error(`[mail:${context}]`, {
    reason: mailResult?.reason || "unknown",
    provider: mailResult?.provider || "none",
    status: mailResult?.status || null,
    details: mailResult?.details || null,
  });
}

async function issueVerification(user, subject = "Verifica tu cuenta en StephFit") {
  const verifyToken = buildVerificationToken();
  user.emailVerificationToken = hashToken(verifyToken);
  user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
  await user.save({ validateBeforeSave: false });

  const verifyUrl = `${getClientUrl()}/verify-email/${verifyToken}`;
  const mailResult = await sendEmail({
    to: user.email,
    subject,
    text: `Verifica tu cuenta aqui: ${verifyUrl}`,
    html: `<p>Bienvenido a StephFit.</p><p>Verifica tu cuenta aqui:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
  });

  return { verifyToken, verifyUrl, mailResult };
}

// POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, height, weight } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const emailCheck = await validateEmailReal(normalizedEmail);
    if (!emailCheck.valid) {
      return res.status(400).json({ message: emailCheck.reason });
    }
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      if (existing.emailVerified) {
        return res.status(409).json({ message: "Ese correo ya esta registrado." });
      }

      const { verifyToken, verifyUrl, mailResult } = await issueVerification(
        existing,
        "Verifica tu cuenta en StephFit",
      );
      if (!mailResult.sent) {
        logMailFailure("register-existing", mailResult);
        return res.status(502).json({
          message:
            "No se pudo enviar el correo de verificacion. Intenta de nuevo en unos minutos.",
        });
      }

      const payload = {
        message:
          "Ese correo ya tiene una cuenta pendiente de verificacion. Te reenviamos el enlace.",
        email: existing.email,
        emailSent: true,
      };
      if (process.env.NODE_ENV !== "production") {
        payload.verifyUrl = verifyUrl;
        payload.verifyToken = verifyToken;
      }
      return res.status(200).json(payload);
    }

    const userData = {
      name,
      email: normalizedEmail,
      password,
      emailVerified: false,
    };
    if (height) userData.height = height;
    if (weight) userData.weight = weight;
    const user = await User.create(userData);

    const { verifyToken, verifyUrl, mailResult } = await issueVerification(user);
    if (!mailResult.sent) {
      logMailFailure("register-new", mailResult);
      await User.deleteOne({ _id: user._id });
      return res.status(502).json({
        message:
          "No se pudo enviar el correo de verificacion. La cuenta no fue creada. Intenta de nuevo.",
      });
    }

    const payload = {
      message:
        "Cuenta creada. Revisa tu correo para verificar tu cuenta antes de iniciar sesion.",
      email: user.email,
      emailSent: true,
    };
    if (process.env.NODE_ENV !== "production") {
      payload.verifyUrl = verifyUrl;
      payload.verifyToken = verifyToken;
    }
    res.status(201).json(payload);
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
    if (!user.emailVerified) {
      return res.status(403).json({
        message:
          "Debes verificar tu correo antes de iniciar sesion. Revisa tu bandeja o solicita reenvio.",
        code: "EMAIL_NOT_VERIFIED",
      });
    }

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
    const hashed = hashToken(req.params.token);
    const user = await User.findOne({
      emailVerificationToken: hashed,
      emailVerificationExpires: { $gt: Date.now() },
    });
    if (!user) {
      return res.status(400).json({ message: "Token de verificacion invalido o expirado." });
    }
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save({ validateBeforeSave: false });
    res.json({ message: "Correo verificado correctamente." });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/resend-verification
exports.resendVerification = async (req, res, next) => {
  try {
    const normalizedEmail = String(req.body?.email || "").trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.json({ message: "Si el correo existe, se enviaran instrucciones." });
    }
    if (user.emailVerified) {
      return res.json({ message: "Este correo ya esta verificado." });
    }

    const { verifyToken, verifyUrl, mailResult } = await issueVerification(
      user,
      "Reenvio de verificacion - StephFit",
    );
    if (!mailResult.sent) {
      logMailFailure("resend-verification", mailResult);
      return res.status(502).json({
        message:
          "No se pudo enviar el correo de verificacion. Intenta de nuevo en unos minutos.",
      });
    }

    const payload = {
      message: "Si el correo existe, se enviaran instrucciones.",
      emailSent: true,
    };
    if (process.env.NODE_ENV !== "production") {
      payload.verifyUrl = verifyUrl;
      payload.verifyToken = verifyToken;
    }
    res.json(payload);
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res, next) => {
  try {
    const normalizedEmail = String(req.body?.email || "").trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    // Do not leak user existence
    if (!user) {
      return res.json({
        message:
          "Si el correo existe, te enviaremos instrucciones para restablecer tu contrasena.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    user.resetPasswordExpires = Date.now() + 30 * 60 * 1000; // 30 min
    await user.save({ validateBeforeSave: false });

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const resetUrl = `${clientUrl}/reset-password/${resetToken}`;
    const payload = {
      message:
        "Si el correo existe, te enviaremos instrucciones para restablecer tu contrasena.",
    };
    if (process.env.NODE_ENV !== "production") {
      payload.resetToken = resetToken;
      payload.resetUrl = resetUrl;
    }
    res.json(payload);
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
