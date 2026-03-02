/**
 * Test Tag/Category Normalization
 * 
 * Verify that duplicate variations are treated as same tag
 * 
 * Usage: node src/seeds/test-normalization.js
 */

const mongoose = require("mongoose");
require("dotenv").config();

const Category = require("../models/category.model");
const Tag = require("../models/tag.model");

async function testNormalization() {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/laca");
    console.log("✅ Connected to MongoDB\n");

    // Get or create test category
    let category = await Category.findOne({ name: "test category" });
    if (!category) {
      category = await Category.create({
        name: "Test Category",
        description: "Test category for normalization",
        icon: "🧪",
        color: "#000000",
      });
      console.log("✅ Created test category\n");
    }

    const categoryId = category._id;

    // Test variations that should be treated as duplicates
    const testCases = [
      { name: "Bóng Đá", expected: "bóng đá" },
      { name: "bóng đá", expected: "bóng đá" },
      { name: "  bóng đá  ", expected: "bóng đá" },
      { name: "Bóng  Đá", expected: "bóng đá" }, // double space
      { name: "BÓNG ĐÁ", expected: "bóng đá" },
      { name: "bóng   đá", expected: "bóng đá" }, // multiple spaces
    ];

    console.log("🧪 Testing Normalization:\n");

    for (const testCase of testCases) {
      try {
        const tag = await Tag.create({
          name: testCase.name,
          description: `Test tag: ${testCase.name}`,
          categoryId,
          icon: "⚽",
        });

        console.log(`✅ "${testCase.name}"`);
        console.log(`   Saved as: "${tag.name}"`);
        console.log(`   Expected: "${testCase.expected}"`);
        console.log(`   Match: ${tag.name === testCase.expected ? "✅" : "❌"}\n`);
      } catch (err) {
        if (err.code === 11000) {
          console.log(`⚠️  "${testCase.name}"`);
          console.log(`   Result: Duplicate detected (index violation) ✅\n`);
        } else {
          console.error(`❌ "${testCase.name}"`, err.message, "\n");
        }
      }
    }

    // Show final tags in this category
    console.log("📋 Final tags in category:");
    const tags = await Tag.find({ categoryId });
    console.log(`   Total: ${tags.length} (should be 1 if duplicates caught)\n`);
    tags.forEach((tag) => {
      console.log(`   - "${tag.name}" (ID: ${tag._id})`);
    });

    // Cleanup
    console.log("\n🧹 Cleaning up test data...");
    await Tag.deleteMany({ categoryId });
    await Category.deleteOne({ _id: categoryId });
    console.log("✅ Test data removed\n");

    console.log("✨ Normalization test complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

// Run
testNormalization();
