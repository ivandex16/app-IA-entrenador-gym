const User = require("../models/User");
const WorkoutLog = require("../models/WorkoutLog");
const Routine = require("../models/Routine");
const Goal = require("../models/Goal");
const Exercise = require("../models/Exercise");

// GET /api/admin/stats
exports.getStats = async (_req, res, next) => {
  try {
    const [
      totalUsers,
      totalWorkouts,
      totalRoutines,
      totalGoals,
      totalExercises,
    ] = await Promise.all([
      User.countDocuments(),
      WorkoutLog.countDocuments(),
      Routine.countDocuments(),
      Goal.countDocuments(),
      Exercise.countDocuments(),
    ]);

    // New users last 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const newUsersWeek = await User.countDocuments({
      createdAt: { $gte: weekAgo },
    });

    // Workouts last 7 days
    const workoutsWeek = await WorkoutLog.countDocuments({
      date: { $gte: weekAgo },
    });

    res.json({
      totalUsers,
      totalWorkouts,
      totalRoutines,
      totalGoals,
      totalExercises,
      newUsersWeek,
      workoutsWeek,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/users
exports.listUsers = async (_req, res, next) => {
  try {
    const users = await User.find()
      .select(
        "name email role level height weight weeklyFrequency createdAt avatar",
      )
      .sort("-createdAt");

    // Enrich with workout count per user
    const userIds = users.map((u) => u._id);
    const workoutCounts = await WorkoutLog.aggregate([
      { $match: { user: { $in: userIds } } },
      { $group: { _id: "$user", count: { $sum: 1 } } },
    ]);
    const countMap = {};
    workoutCounts.forEach((w) => {
      countMap[w._id.toString()] = w.count;
    });

    const enriched = users.map((u) => ({
      ...u.toObject(),
      workoutCount: countMap[u._id.toString()] || 0,
    }));

    res.json(enriched);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/users/:id/role  { role: 'admin' | 'user' }
exports.updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!["admin", "user"].includes(role)) {
      return res.status(400).json({ message: "Rol inválido" });
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true },
    ).select("name email role");
    if (!user)
      return res.status(404).json({ message: "Usuario no encontrado" });
    res.json(user);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/users/:id
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user)
      return res.status(404).json({ message: "Usuario no encontrado" });
    if (user.role === "admin") {
      return res
        .status(400)
        .json({ message: "No se puede eliminar a un administrador" });
    }

    // Clean up user data
    await Promise.all([
      WorkoutLog.deleteMany({ user: user._id }),
      Routine.deleteMany({ user: user._id }),
      Goal.deleteMany({ user: user._id }),
    ]);
    await User.findByIdAndDelete(user._id);

    res.json({ message: "Usuario y sus datos eliminados" });
  } catch (err) {
    next(err);
  }
};
