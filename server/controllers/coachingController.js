const CoachingAssignment = require("../models/CoachingAssignment");
const Exercise = require("../models/Exercise");
const Routine = require("../models/Routine");
const User = require("../models/User");
const WorkoutLog = require("../models/WorkoutLog");
const { notifyRoutineAssignment } = require("../services/notificationService");

const GOALS = new Set([
  "muscle_gain",
  "fat_loss",
  "endurance",
  "toning",
  "strength",
  "general",
]);

const normalizeReminder = (input = {}) => ({
  enabled: Boolean(input.enabled),
  weekday: String(input.weekday || "").trim(),
  time: String(input.time || "").trim(),
  message: String(input.message || "").trim().slice(0, 160),
});

const canManageClient = (manager, client) => {
  if (!manager || !client) return false;
  if (manager.role === "admin") return true;
  return String(client.assignedTrainer || "") === String(manager._id);
};

async function getManagedClientOrThrow(manager, clientId) {
  const client = await User.findById(clientId)
    .select("name email role assignedTrainer level height weight weeklyFrequency")
    .populate("assignedTrainer", "name email role");

  if (!client || client.role !== "user") {
    return { status: 404, message: "Cliente no encontrado" };
  }
  if (!canManageClient(manager, client)) {
    return { status: 403, message: "No puedes gestionar este cliente" };
  }
  return { client };
}

async function buildOverview(manager) {
  const clientFilter =
    manager.role === "admin"
      ? { role: "user" }
      : { role: "user", assignedTrainer: manager._id };

  const [clients, trainers, activeAssignments, workoutCount] = await Promise.all([
    User.find(clientFilter)
      .select("name email level height weight weeklyFrequency assignedTrainer createdAt")
      .populate("assignedTrainer", "name email role")
      .sort({ name: 1 }),
    manager.role === "admin"
      ? User.find({ role: { $in: ["trainer", "admin"] } })
          .select("name email role createdAt")
          .sort({ role: 1, name: 1 })
      : Promise.resolve([]),
    CoachingAssignment.countDocuments({
      ...(manager.role === "admin" ? {} : { trainer: manager._id }),
      status: "active",
    }),
    WorkoutLog.countDocuments({
      user: {
        $in: await User.find(clientFilter).distinct("_id"),
      },
    }),
  ]);

  return {
    clients,
    trainers,
    stats: {
      totalClients: clients.length,
      totalTrainers: trainers.length,
      activeAssignments,
      workoutCount,
    },
  };
}

async function buildProgressSummary(clientId) {
  const [logs, assignments] = await Promise.all([
    WorkoutLog.find({ user: clientId })
      .populate("routine", "name")
      .populate("exercises.exercise", "name")
      .sort({ date: -1 })
      .limit(20),
    CoachingAssignment.find({ client: clientId })
      .populate("trainer", "name email role")
      .populate("routine", "name description")
      .sort({ createdAt: -1 }),
  ]);

  let totalSets = 0;
  let totalReps = 0;
  let totalWeight = 0;
  let maxWeight = 0;

  for (const log of logs) {
    for (const exercise of log.exercises || []) {
      for (const set of exercise.sets || []) {
        totalSets += 1;
        totalReps += Number(set.reps || 0);
        totalWeight += Number(set.reps || 0) * Number(set.weight || 0);
        maxWeight = Math.max(maxWeight, Number(set.weight || 0));
      }
    }
  }

  const activeAssignments = assignments.filter((item) => item.status === "active");
  const routineIds = activeAssignments.map((item) => item.routine?._id).filter(Boolean);
  const complianceLogs = routineIds.length
    ? await WorkoutLog.countDocuments({
        user: clientId,
        routine: { $in: routineIds },
        date: {
          $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      })
    : 0;

  const complianceTarget = activeAssignments.reduce(
    (sum, item) => sum + Math.max(item.days?.length || 0, 1),
    0,
  );
  const complianceRate = complianceTarget
    ? Math.min(100, Math.round((complianceLogs / complianceTarget) * 100))
    : 0;

  return {
    stats: {
      workoutCount: logs.length,
      totalSets,
      totalReps,
      totalWeight,
      maxWeight,
      complianceRate,
    },
    recentWorkouts: logs,
    assignments,
  };
}

// GET /api/coaching/overview
exports.getOverview = async (req, res, next) => {
  try {
    const overview = await buildOverview(req.user);
    res.json(overview);
  } catch (err) {
    next(err);
  }
};

// GET /api/coaching/clients
exports.listClients = async (req, res, next) => {
  try {
    const filter =
      req.user.role === "admin"
        ? { role: "user" }
        : { role: "user", assignedTrainer: req.user._id };

    const clients = await User.find(filter)
      .select("name email level height weight weeklyFrequency assignedTrainer createdAt")
      .populate("assignedTrainer", "name email role")
      .sort({ name: 1 });

    res.json(clients);
  } catch (err) {
    next(err);
  }
};

// GET /api/coaching/trainers
exports.listTrainers = async (_req, res, next) => {
  try {
    const trainers = await User.find({ role: { $in: ["trainer", "admin"] } })
      .select("name email role createdAt")
      .sort({ role: 1, name: 1 });

    res.json(trainers);
  } catch (err) {
    next(err);
  }
};

// GET /api/coaching/assignments
exports.listAssignments = async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.role !== "admin") {
      filter.trainer = req.user._id;
    }
    if (req.query.clientId) {
      filter.client = req.query.clientId;
    }

    const assignments = await CoachingAssignment.find(filter)
      .populate("client", "name email assignedTrainer")
      .populate("trainer", "name email role")
      .populate("routine", "name description updatedAt")
      .populate("days.exercises.exercise", "name muscleGroup")
      .populate("comments.author", "name email role")
      .sort({ updatedAt: -1 });

    res.json(assignments);
  } catch (err) {
    next(err);
  }
};

// GET /api/coaching/clients/:id/progress
exports.getClientProgress = async (req, res, next) => {
  try {
    const result = await getManagedClientOrThrow(req.user, req.params.id);
    if (result.status) {
      return res.status(result.status).json({ message: result.message });
    }

    const progress = await buildProgressSummary(req.params.id);
    res.json({
      client: result.client,
      ...progress,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/coaching/assignments
exports.createAssignment = async (req, res, next) => {
  try {
    const {
      clientId,
      title,
      description,
      goal,
      reminder,
      days = [],
    } = req.body || {};

    if (!clientId || !title || !Array.isArray(days) || days.length === 0) {
      return res.status(400).json({
        message: "Debes indicar cliente, titulo y al menos un dia de entrenamiento",
      });
    }

    const access = await getManagedClientOrThrow(req.user, clientId);
    if (access.status) {
      return res.status(access.status).json({ message: access.message });
    }

    const exerciseIds = days.flatMap((day) =>
      (day.exercises || []).map((exercise) => exercise.exercise),
    );
    const uniqueExerciseIds = [...new Set(exerciseIds.filter(Boolean).map(String))];
    const exerciseDocs = await Exercise.find({ _id: { $in: uniqueExerciseIds } }).select(
      "_id name muscleGroup",
    );
    const exerciseMap = new Map(exerciseDocs.map((doc) => [String(doc._id), doc]));

    if (exerciseMap.size !== uniqueExerciseIds.length) {
      return res.status(400).json({
        message: "Uno o mas ejercicios no existen en el catalogo",
      });
    }

    const normalizedDays = days.map((day, dayIndex) => ({
      dayLabel: String(day.dayLabel || `Dia ${dayIndex + 1}`).trim(),
      exercises: (day.exercises || []).map((exercise, exerciseIndex) => ({
        exercise: exercise.exercise,
        order: exerciseIndex,
        sets: Math.max(1, Number(exercise.sets) || 3),
        repsMin: Math.max(1, Number(exercise.repsMin) || Number(exercise.reps) || 8),
        repsMax: Math.max(
          Math.max(1, Number(exercise.repsMin) || Number(exercise.reps) || 8),
          Number(exercise.repsMax) || Number(exercise.reps) || 12,
        ),
        restSeconds: Math.max(15, Number(exercise.restSeconds) || 90),
        notes: String(exercise.notes || "").trim().slice(0, 250),
      })),
    }));

    if (normalizedDays.some((day) => !day.exercises.length)) {
      return res.status(400).json({
        message: "Cada dia de entrenamiento debe tener al menos un ejercicio",
      });
    }

    const safeGoal = GOALS.has(goal) ? goal : "general";
    const trainerId =
      req.user.role === "admin"
        ? access.client.assignedTrainer?._id || req.user._id
        : req.user._id;

    const routine = await Routine.create({
      user: access.client._id,
      name: String(title).trim(),
      description: String(description || "").trim(),
      goal: safeGoal,
      targetMuscleGroups: [
        ...new Set(
          normalizedDays.flatMap((day) =>
            day.exercises.map((exercise) => exerciseMap.get(String(exercise.exercise)).muscleGroup),
          ),
        ),
      ],
      days: normalizedDays,
    });

    const assignment = await CoachingAssignment.create({
      client: access.client._id,
      trainer: trainerId,
      createdBy: req.user._id,
      routine: routine._id,
      title: String(title).trim(),
      description: String(description || "").trim(),
      goal: safeGoal,
      days: normalizedDays,
      reminder: normalizeReminder(reminder),
      comments: [],
    });

    const populated = await CoachingAssignment.findById(assignment._id)
      .populate("client", "name email assignedTrainer")
      .populate("trainer", "name email role")
      .populate("routine", "name description updatedAt")
      .populate("days.exercises.exercise", "name muscleGroup");

    await notifyRoutineAssignment({
      clientId: access.client._id,
      trainerName: req.user.name || "Tu entrenador",
      routineName: String(title).trim(),
      assignmentId: assignment._id,
      routineId: routine._id,
    });

    res.status(201).json({
      message: "Rutina asignada correctamente",
      assignment: populated,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/coaching/assignments/:id/comments
exports.addComment = async (req, res, next) => {
  try {
    const message = String(req.body?.message || "").trim();
    if (!message) {
      return res.status(400).json({ message: "Debes escribir un comentario" });
    }

    const assignment = await CoachingAssignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ message: "Asignacion no encontrada" });
    }

    const access = await getManagedClientOrThrow(req.user, assignment.client);
    if (access.status) {
      return res.status(access.status).json({ message: access.message });
    }

    assignment.comments.push({
      author: req.user._id,
      authorRole: req.user.role === "admin" ? "admin" : "trainer",
      message,
    });
    await assignment.save();

    await assignment.populate("comments.author", "name email role");
    res.status(201).json({
      message: "Comentario agregado correctamente",
      comments: assignment.comments,
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/coaching/assignments/:id/status
exports.updateAssignmentStatus = async (req, res, next) => {
  try {
    const status = String(req.body?.status || "");
    if (!["active", "completed", "archived"].includes(status)) {
      return res.status(400).json({ message: "Estado invalido" });
    }

    const assignment = await CoachingAssignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ message: "Asignacion no encontrada" });
    }

    const access = await getManagedClientOrThrow(req.user, assignment.client);
    if (access.status) {
      return res.status(access.status).json({ message: access.message });
    }

    assignment.status = status;
    await assignment.save();

    res.json({
      message: "Estado actualizado correctamente",
      assignment,
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/coaching/assignments/:id/reminder
exports.updateReminder = async (req, res, next) => {
  try {
    const assignment = await CoachingAssignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ message: "Asignacion no encontrada" });
    }

    const access = await getManagedClientOrThrow(req.user, assignment.client);
    if (access.status) {
      return res.status(access.status).json({ message: access.message });
    }

    assignment.reminder = normalizeReminder(req.body);
    await assignment.save();

    res.json({
      message: "Recordatorio actualizado correctamente",
      reminder: assignment.reminder,
    });
  } catch (err) {
    next(err);
  }
};
