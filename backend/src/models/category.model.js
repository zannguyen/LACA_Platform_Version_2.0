const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      unique: true,
      trim: true,
    },
    description: String,
    icon: String, // icon URL (⚽ football, 🏸 badminton, etc.)
    color: String, // hex color for UI
    order: {
      type: Number,
      default: 0, // sort order in UI
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

/**
 * Trim and normalize category name before saving
 * - trim whitespace
 * - remove multiple spaces (replace with single space)
 */
categorySchema.pre("save", async function () {
  if (this.name) {
    this.name = this.name.trim().replace(/\s+/g, " ");
  }
});

// Index for faster queries (case-insensitive unique)
categorySchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });
categorySchema.index({ isActive: 1 });
categorySchema.index({ name: "text" });

module.exports = mongoose.model("Category", categorySchema);
