/**
 * Seed admin user for the platform.
 * Usage: node seeds/seedAdmin.js
 */
require("dotenv").config({ path: "../.env" });
const mongoose = require("mongoose");
const User = require("../models/User");
const connectDB = require("../config/db");

const ADMIN_EMAIL = "ivan_cabegarces@hotmail.com";
const ADMIN_PASSWORD = "AdminGym2026!";
const ADMIN_NAME = "Ivan (Admin)";

async function seedAdmin() {
  await connectDB();

  let user = await User.findOne({ email: ADMIN_EMAIL });

  if (user) {
    user.role = "admin";
    await user.save({ validateBeforeSave: false });
    console.log(`✅ Usuario existente actualizado a admin: ${ADMIN_EMAIL}`);
  } else {
    user = await User.create({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      role: "admin",
      level: "advanced",
    });
    console.log(`✅ Usuario admin creado: ${ADMIN_EMAIL}`);
  }

  console.log(`   Contraseña: ${ADMIN_PASSWORD}`);
  await mongoose.disconnect();
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
