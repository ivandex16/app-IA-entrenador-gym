const mongoose = require("mongoose");

const assignmentExerciseSchema = new mongoose.Schema(
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
    restSeconds: { type: Number, default: 90 },
    notes: { type: String, default: "" },
  },
  { _id: false },
);

const assignmentDaySchema = new mongoose.Schema(
  {
    dayLabel: { type: String, required: true, trim: true },
    exercises: [assignmentExerciseSchema],
  },
  { _id: false },
);

const commentSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    authorRole: { type: String, enum: ["trainer", "admin"], required: true },
    message: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const reminderSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    weekday: { type: String, default: "" },
    time: { type: String, default: "" },
    message: { type: String, default: "" },
  },
  { _id: false },
);

const coachingAssignmentSchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    trainer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    routine: { type: mongoose.Schema.Types.ObjectId, ref: "Routine", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    goal: { type: String, default: "general" },
    days: [assignmentDaySchema],
    reminder: { type: reminderSchema, default: () => ({}) },
    status: {
      type: String,
      enum: ["active", "completed", "archived"],
      default: "active",
    },
    comments: [commentSchema],
  },
  { timestamps: true },
);

module.exports = mongoose.model("CoachingAssignment", coachingAssignmentSchema);
