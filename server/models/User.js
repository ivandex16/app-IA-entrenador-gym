const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    avatar: { type: String, default: "" },
    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },
    height: { type: Number, min: 50, max: 300 },
    weight: { type: Number, min: 20, max: 500 },
    weeklyFrequency: { type: Number, default: 3, min: 1, max: 7 },
    availableMinutes: { type: Number, default: 60 },
    preferences: {
      equipment: [String], // e.g. ['barbell','dumbbell','bodyweight']
      focusMuscleGroups: [String], // e.g. ['chest','back']
    },
    tourCompleted: { type: Boolean, default: false },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
  },
  { timestamps: true },
);

// Hash password before save
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Instance method – compare passwords
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model("User", userSchema);
