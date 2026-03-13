const mongoose = require("mongoose");

const mealSchema = new mongoose.Schema(
  {
    mealType: { type: String, default: "" },
    name: { type: String, required: true, trim: true },
    ingredients: [{ type: String }],
    steps: [{ type: String }],
    whyFits: { type: String, default: "" },
    macros: {
      protein: { type: String, default: "" },
      carbs: { type: String, default: "" },
      fats: { type: String, default: "" },
    },
  },
  { _id: false },
);

const weeklyDaySchema = new mongoose.Schema(
  {
    day: { type: String, required: true, trim: true },
    meals: [mealSchema],
  },
  { _id: false },
);

const savedFitRecipeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    mode: {
      type: String,
      enum: ["plan", "ingredients"],
      required: true,
    },
    objective: { type: String, default: "fitness_general" },
    mealType: { type: String, default: "all" },
    isWeekly: { type: Boolean, default: false },
    engine: { type: String, default: "fallback" },
    disclaimer: { type: String, default: "" },
    requestSnapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
    meals: [mealSchema],
    weeklyPlan: [weeklyDaySchema],
    generalTips: [{ type: String }],
    hydrationTips: [{ type: String }],
  },
  { timestamps: true },
);

module.exports = mongoose.model("SavedFitRecipe", savedFitRecipeSchema);
