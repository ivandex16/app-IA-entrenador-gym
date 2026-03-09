const mongoose = require("mongoose");

const routineExerciseSchema = new mongoose.Schema(
  {
    exercise: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exercise",
      required: true,
    },
    order: { type: Number, default: 0 },
    sets: { type: Number, default: 3 },
    repsMin: { type: Number, default: 8 },
    repsMax: { type: Number, default: 12 },
    weight: { type: Number, default: 0 },
    restSeconds: { type: Number, default: 90 },
    notes: { type: String, default: "" },
  },
  { _id: false },
);

const routineDaySchema = new mongoose.Schema(
  {
    dayLabel: { type: String, default: "Día 1" },
    exercises: [routineExerciseSchema],
  },
  { _id: true },
);

const routineSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    day: {
      type: String,
      enum: [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
        "any",
      ],
      default: "any",
    },
    targetMuscleGroups: [String],
    goal: {
      type: String,
      enum: [
        "muscle_gain",
        "fat_loss",
        "endurance",
        "toning",
        "strength",
        "general",
      ],
      default: "general",
    },
    exercises: [routineExerciseSchema],
    days: [routineDaySchema],
    isAIGenerated: { type: Boolean, default: false },
  },
  { timestamps: true },
);

routineSchema.index({ user: 1 });

module.exports = mongoose.model("Routine", routineSchema);
