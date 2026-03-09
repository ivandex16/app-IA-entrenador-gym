const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['muscle_gain', 'fat_loss', 'endurance', 'toning', 'strength'],
    },
    description: { type: String, default: '' },
    targetDate: Date,
    isActive: { type: Boolean, default: true },
    metrics: {
      startWeight: Number,   // kg (body weight)
      targetWeight: Number,
      startMaxLift: Number,  // kg (1RM benchmark)
      targetMaxLift: Number,
    },
  },
  { timestamps: true }
);

goalSchema.index({ user: 1, isActive: 1 });

module.exports = mongoose.model('Goal', goalSchema);
