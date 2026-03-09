const mongoose = require('mongoose');

const recommendationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['exercise', 'routine', 'tip'],
      default: 'exercise',
    },
    engine: {
      type: String,
      enum: ['rules', 'scoring', 'llm'],
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    exercises: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise' },
    ],
    routine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Routine',
    },
    score: { type: Number, default: 0 },    // internal relevance score
    accepted: { type: Boolean, default: null }, // user feedback
  },
  { timestamps: true }
);

recommendationSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('AIRecommendation', recommendationSchema);
