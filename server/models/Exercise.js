const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    muscleGroup: {
      type: String,
      required: true,
      enum: [
        'chest',
        'back',
        'shoulders',
        'biceps',
        'triceps',
        'legs',
        'glutes',
        'abs',
        'forearms',
        'calves',
        'full_body',
        'cardio',
      ],
    },
    secondaryMuscles: [String],
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'intermediate',
    },
    equipment: {
      type: String,
      enum: [
        'barbell',
        'dumbbell',
        'machine',
        'cable',
        'bodyweight',
        'kettlebell',
        'band',
        'other',
      ],
      default: 'bodyweight',
    },
    category: {
      type: String,
      enum: ['strength', 'hypertrophy', 'endurance', 'power', 'flexibility'],
      default: 'hypertrophy',
    },
    imageUrl: { type: String, default: '' },
    youtubeVideoId: { type: String, default: '' }, // e.g. 'dQw4w9WgXcQ'
    instructions: [String],
    tips: [String],
  },
  { timestamps: true }
);

exerciseSchema.index({ muscleGroup: 1, difficulty: 1, equipment: 1 });

module.exports = mongoose.model('Exercise', exerciseSchema);
