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
    // Small version of imageUrl for lists and pickers (optional; lists fall back to imageUrl).
    thumbnailUrl: { type: String, default: undefined },
    youtubeVideoId: { type: String, default: '' }, // e.g. 'dQw4w9WgXcQ'
    instructions: [String],
    tips: [String],
    // Other names (e.g. English) used to recognise the exercise in imported routines.
    aliases: { type: [String], default: undefined },
    // Imported from an open catalog (e.g. wger, CC-BY-SA): credited in the app as the license requires.
    source: {
      type: new mongoose.Schema(
        {
          provider: String,
          externalId: String,
          url: String,
          license: String,
          licenseUrl: String,
          author: String,
          imageAuthor: String,
        },
        { _id: false }
      ),
      default: undefined,
    },
  },
  { timestamps: true }
);

exerciseSchema.index({ muscleGroup: 1, difficulty: 1, equipment: 1 });
exerciseSchema.index({ 'source.provider': 1, imageUrl: -1, muscleGroup: 1, name: 1 }); // paginated catalog order
// One document per imported exercise (re-running an import updates it, never duplicates).
exerciseSchema.index(
  { 'source.provider': 1, 'source.externalId': 1 },
  { unique: true, partialFilterExpression: { 'source.provider': { $exists: true } } }
);

module.exports = mongoose.model('Exercise', exerciseSchema);
