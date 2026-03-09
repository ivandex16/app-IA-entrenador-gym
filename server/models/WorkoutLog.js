const mongoose = require('mongoose');

const setLogSchema = new mongoose.Schema(
  {
    setNumber: { type: Number, required: true },
    reps: { type: Number, required: true },
    weight: { type: Number, default: 0 },   // kg
    rpe: { type: Number, min: 1, max: 10 }, // rate of perceived exertion
  },
  { _id: false }
);

const exerciseLogSchema = new mongoose.Schema(
  {
    exercise: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exercise',
      required: true,
    },
    sets: [setLogSchema],
  },
  { _id: false }
);

const workoutLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    routine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Routine',
    },
    date: { type: Date, default: Date.now },
    durationMinutes: { type: Number, default: 0 },
    exercises: [exerciseLogSchema],
    notes: { type: String, default: '' },
    feeling: {
      type: String,
      enum: ['great', 'good', 'ok', 'tired', 'bad'],
      default: 'good',
    },
    caloriesBurned: { type: Number, default: 0 },
  },
  { timestamps: true }
);

workoutLogSchema.index({ user: 1, date: -1 });

module.exports = mongoose.model('WorkoutLog', workoutLogSchema);
