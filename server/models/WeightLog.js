const mongoose = require('mongoose');

const weightLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    weight: { type: Number, required: true, min: 20, max: 500 },
    date: { type: Date, default: Date.now },
    notes: { type: String, default: '', maxlength: 500 },
  },
  { timestamps: true }
);

weightLogSchema.index({ user: 1, date: -1 });

module.exports = mongoose.model('WeightLog', weightLogSchema);
