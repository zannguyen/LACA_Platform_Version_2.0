#!/usr/bin/env node
/**
 * Promote User to Admin Role
 * 
 * Usage:
 *   node src/scripts/promote-to-admin.js <userId>
 *   node src/scripts/promote-to-admin.js 697956ed55562b6cbf659485
 * 
 * This script:
 * - Connects to MongoDB
 * - Finds user by ID
 * - Updates role from "user" to "admin"
 * - Shows confirmation
 * 
 * Impact: MINIMAL - Only updates user role in DB, no code changes
 */

const mongoose = require("mongoose");
require("dotenv").config();

const User = require("../models/user.model");

async function promoteToAdmin(userId) {
  try {
    // Connect
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error("❌ Invalid User ID format");
      process.exit(1);
    }

    // Find user first
    const user = await User.findById(userId);
    if (!user) {
      console.error("❌ User not found");
      process.exit(1);
    }

    // Check current role
    if (user.role === "admin") {
      console.log("ℹ️  User is already admin");
      console.log(`   ID: ${user._id}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Email: ${user.email}`);
      process.exit(0);
    }

    // Promote
    const result = await User.findByIdAndUpdate(
      userId,
      { role: "admin" },
      { new: true }
    );

    console.log("✅ User promoted to admin successfully!\n");
    console.log("📋 User Details:");
    console.log(`   ID: ${result._id}`);
    console.log(`   Username: ${result.username}`);
    console.log(`   Email: ${result.email}`);
    console.log(`   Role: ${result.role}`);
    console.log(`   Active: ${result.isActive}`);
    console.log(`   Email Verified: ${result.isEmailVerified}\n`);

    console.log("🎯 Next Steps:");
    console.log("   1. Test creating tag via API");
    console.log("   2. Go to /admin/tags");
    console.log("   3. Try creating/editing categories and tags\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

// Main
const userId = process.argv[2];

if (!userId) {
  console.error("\n❌ Missing User ID argument\n");
  console.log("Usage:");
  console.log("  node src/scripts/promote-to-admin.js <userId>\n");
  console.log("Example:");
  console.log("  node src/scripts/promote-to-admin.js 697956ed55562b6cbf659485\n");
  process.exit(1);
}

promoteToAdmin(userId);
