require("dotenv").config({ path: "../.env" });
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorHandler");

// ── Connect to MongoDB ──
connectDB();

const app = express();

// ── Global middleware ──
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

// Rate limiter – 1000 req / 15 min per IP
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

// ── Serve uploaded files ──
const path = require("path");
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ── API Routes ──
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/exercises", require("./routes/exercises"));
app.use("/api/routines", require("./routes/routines"));
app.use("/api/workouts", require("./routes/workouts"));
app.use("/api/goals", require("./routes/goals"));
app.use("/api/progress", require("./routes/progress"));
app.use("/api/recommendations", require("./routes/recommendations"));
app.use("/api/weight", require("./routes/weight"));
app.use("/api/admin", require("./routes/admin"));

// ── Health check ──
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// ── Error handler (must be last) ──
app.use(errorHandler);

// ── Start server ──
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

module.exports = app; // for testing
