const User = require("../models/User");
const multer = require("multer");

// ── Multer config (memory storage for base64 conversion) ──
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = /^image\/(jpeg|jpg|png|webp)$/;
    cb(null, allowed.test(file.mimetype));
  },
});

exports.uploadAvatar = upload;

// GET /api/users/profile
exports.getProfile = async (req, res) => {
  res.json(req.user);
};

// PUT /api/users/profile
exports.updateProfile = async (req, res, next) => {
  try {
    const allowed = [
      "name",
      "avatar",
      "level",
      "height",
      "weight",
      "weeklyFrequency",
      "availableMinutes",
      "preferences",
    ];
    const updates = {};
    allowed.forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
};

// POST /api/users/avatar — upload profile photo (stored as base64 in DB)
exports.updateAvatar = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No se envió ninguna imagen' });

    const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const user = await User.findByIdAndUpdate(req.user._id, { avatar: base64 }, { new: true });
    res.json({ avatar: user.avatar });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/users/avatar — remove profile photo
exports.removeAvatar = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { avatar: '' });
    res.json({ message: 'Avatar eliminado' });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/users/tour-complete
exports.completeTour = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { tourCompleted: true });
    res.json({ tourCompleted: true });
  } catch (err) {
    next(err);
  }
};

// GET /api/users  (admin)
exports.listUsers = async (_req, res, next) => {
  try {
    const users = await User.find().select("-__v");
    res.json(users);
  } catch (err) {
    next(err);
  }
};
