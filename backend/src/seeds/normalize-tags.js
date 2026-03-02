/**
 * Normalize Tags & Categories - Remove Duplicates
 * 
 * This script:
 * 1. Normalizes all tag names (trim, lowercase, remove extra spaces)
 * 2. Removes duplicate tags within same category
 * 3. Normalizes all category names
 * 4. Removes duplicate categories
 * 
 * Usage: node src/seeds/normalize-tags.js
 */

const mongoose = require("mongoose");
require("dotenv").config();

const Category = require("../models/category.model");
const Tag = require("../models/tag.model");

async function normalizeAndCleanup() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/laca");
    console.log("✅ Connected to MongoDB\n");

    // ============ NORMALIZE & DEDUPLICATE CATEGORIES ============
    console.log("🔄 Processing categories...");
    
    const categories = await Category.find({});
    console.log(`   Found ${categories.length} categories`);

    const categoryMap = new Map(); // normalized name -> first doc
    let categoriesRemoved = 0;

    for (const cat of categories) {
      const normalized = cat.name.trim().toLowerCase().replace(/\s+/g, " ");
      
      if (!categoryMap.has(normalized)) {
        // First occurrence - keep it
        categoryMap.set(normalized, cat._id);
      } else {
        // Duplicate found - remove it
        await Category.deleteOne({ _id: cat._id });
        categoriesRemoved++;
        console.log(`   ❌ Removed duplicate category: "${cat.name}" → "${normalized}"`);
      }
    }

    console.log(`   ✅ Categories: ${categories.length - categoriesRemoved} kept, ${categoriesRemoved} removed\n`);

    // ============ NORMALIZE & DEDUPLICATE TAGS ============
    console.log("🔄 Processing tags...");

    const tags = await Tag.find({});
    console.log(`   Found ${tags.length} tags`);

    const tagMap = new Map(); // "categoryId|normalized name" -> first doc
    let tagsRemoved = 0;

    for (const tag of tags) {
      const normalized = tag.name.trim().toLowerCase().replace(/\s+/g, " ");
      const key = `${tag.categoryId}|${normalized}`;

      if (!tagMap.has(key)) {
        // First occurrence - keep it
        tagMap.set(key, tag._id);
      } else {
        // Duplicate found - remove it
        await Tag.deleteOne({ _id: tag._id });
        tagsRemoved++;
        console.log(
          `   ❌ Removed duplicate tag: "${tag.name}" (Category: ${tag.categoryId}) → "${normalized}"`
        );
      }
    }

    console.log(`   ✅ Tags: ${tags.length - tagsRemoved} kept, ${tagsRemoved} removed\n`);

    // ============ DROP OLD UNIQUE INDEX ============
    console.log("🔄 Updating database indexes...");
    
    try {
      // Drop old global unique index on name (if exists)
      await mongoose.connection.db.collection("tags").dropIndex("name_1");
      console.log("   ✅ Dropped old global unique index on tags");
    } catch (e) {
      console.log("   ℹ️  Old index not found (already dropped)");
    }

    try {
      await mongoose.connection.db.collection("categories").dropIndex("name_1");
      console.log("   ✅ Dropped old unique index on categories");
    } catch (e) {
      console.log("   ℹ️  Old index not found or cannot be dropped");
    }

    // Create new indexes via model
    await Tag.collection.createIndex({ categoryId: 1, name: 1 }, { unique: true });
    console.log("   ✅ Created new unique index: (categoryId, name) on tags\n");

    // ============ VERIFICATION ============
    console.log("✨ Verification:");
    const finalCategories = await Category.find({});
    const finalTags = await Tag.find({});

    console.log(`   📊 Final categories: ${finalCategories.length}`);
    console.log(`   📊 Final tags: ${finalTags.length}`);

    // Check for duplicates in each category
    const categoriesWithMultipleTags = await Tag.aggregate([
      {
        $group: {
          _id: { categoryId: "$categoryId", name: "$name" },
          count: { $sum: 1 },
        },
      },
      {
        $match: { count: { $gt: 1 } },
      },
    ]);

    if (categoriesWithMultipleTags.length > 0) {
      console.log(
        `   ⚠️  WARNING: Found ${categoriesWithMultipleTags.length} duplicate tags:\n`,
        categoriesWithMultipleTags
      );
    } else {
      console.log(`   ✅ No duplicate tags found within categories`);
    }

    console.log("\n✨ Normalization & cleanup complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

// Run
normalizeAndCleanup();
