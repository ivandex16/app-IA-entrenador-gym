const Notification = require("../models/Notification");

// GET /api/notifications
exports.listMine = async (req, res, next) => {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 15));
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(limit);

    const unreadCount = await Notification.countDocuments({
      user: req.user._id,
      readAt: null,
    });

    res.json({
      notifications,
      unreadCount,
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/notifications/:id/read
exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user._id,
      },
      {
        $set: { readAt: new Date() },
      },
      { new: true },
    );

    if (!notification) {
      return res.status(404).json({ message: "Notificacion no encontrada" });
    }

    res.json({
      message: "Notificacion marcada como leida",
      notification,
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/notifications/read-all
exports.markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      {
        user: req.user._id,
        readAt: null,
      },
      {
        $set: { readAt: new Date() },
      },
    );

    res.json({ message: "Notificaciones marcadas como leidas" });
  } catch (err) {
    next(err);
  }
};
