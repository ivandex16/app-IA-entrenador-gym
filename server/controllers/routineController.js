const Routine = require("../models/Routine");
const Exercise = require("../models/Exercise");

// GET /api/routines
exports.list = async (req, res, next) => {
  try {
    const routines = await Routine.find({ user: req.user._id })
      .populate("exercises.exercise", "name muscleGroup")
      .populate("days.exercises.exercise", "name muscleGroup")
      .sort("-updatedAt");
    res.json(routines);
  } catch (err) {
    next(err);
  }
};

// GET /api/routines/:id
exports.getById = async (req, res, next) => {
  try {
    const routine = await Routine.findOne({
      _id: req.params.id,
      user: req.user._id,
    })
      .populate("exercises.exercise")
      .populate("days.exercises.exercise");
    if (!routine) return res.status(404).json({ message: "Routine not found" });

    // Auto-migrate legacy flat-exercises routines into days[]
    if (
      (!routine.days || routine.days.length === 0) &&
      routine.exercises &&
      routine.exercises.length > 0
    ) {
      routine.days = [{ dayLabel: "Lunes", exercises: routine.exercises }];
      routine.exercises = [];
      await routine.save();
      // Re-populate after save
      await routine.populate("days.exercises.exercise");
    }

    res.json(routine);
  } catch (err) {
    next(err);
  }
};

exports.GOALS = Routine.schema.path("goal").enumValues;

/*
 * POST /api/routines — creates the whole routine (days + exercises) in a single
 * insert. MongoDB writes one document atomically, so a failure never leaves a
 * half-built or empty routine. Only known fields are taken from the body.
 */
exports.create = async (req, res, next) => {
  try {
    const days = req.body.days.map((d, i) => ({
      dayLabel: String(d.dayLabel || `Día ${i + 1}`).trim(),
      exercises: d.exercises.map((e, order) => {
        const repsMin = Number(e.repsMin);
        const repsMax = e.repsMax === undefined || e.repsMax === "" ? repsMin : Number(e.repsMax);
        return {
          exercise: e.exercise,
          order,
          sets: Number(e.sets),
          repsMin,
          repsMax: Math.max(repsMin, repsMax),
          weight: Number(e.weight) || 0,
          restSeconds: e.restSeconds === undefined || e.restSeconds === "" ? 0 : Number(e.restSeconds),
          notes: typeof e.notes === "string" ? e.notes.trim() : "",
        };
      }),
    }));

    // Every exercise must exist in the catalog (no dangling references).
    const ids = [...new Set(days.flatMap((d) => d.exercises.map((e) => String(e.exercise))))];
    const found = await Exercise.find({ _id: { $in: ids } }).select("muscleGroup").lean();
    if (found.length !== ids.length) {
      return res.status(422).json({ message: "Algún ejercicio de la rutina ya no existe en el catálogo." });
    }

    const routine = await Routine.create({
      user: req.user._id,
      name: req.body.name.trim(),
      description: typeof req.body.description === "string" ? req.body.description.trim() : "",
      goal: req.body.goal || "general",
      targetMuscleGroups: [...new Set(found.map((e) => e.muscleGroup))],
      days,
      exercises: [],
    });
    res.status(201).json(routine);
  } catch (err) {
    next(err);
  }
};

// PUT /api/routines/:id
exports.update = async (req, res, next) => {
  try {
    const routine = await Routine.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true },
    );
    if (!routine) return res.status(404).json({ message: "Routine not found" });
    res.json(routine);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/routines/:id
exports.remove = async (req, res, next) => {
  try {
    const routine = await Routine.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!routine) return res.status(404).json({ message: "Routine not found" });
    res.json({ message: "Routine deleted" });
  } catch (err) {
    next(err);
  }
};
