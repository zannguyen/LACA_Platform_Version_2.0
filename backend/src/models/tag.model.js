const mongoose = require("mongoose");

const tagSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Tag name is required"],
      trim: true,
    },
    description: String,
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    icon: String, // icon URL for frontend display
    color: String, // hex color for UI
    order: {
      type: Number,
      default: 0, // sort order within category
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

/**
 * Trim tag name before saving
 * - trim whitespace
 * - remove multiple spaces (replace with single space)
 */
tagSchema.pre("save", async function () {
  if (this.name) {
    this.name = this.name.trim().replace(/\s+/g, " ");
  }
});

// Index for faster queries - UNIQUE per category (case-insensitive)
tagSchema.index({ categoryId: 1, name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });
tagSchema.index({ categoryId: 1, isActive: 1 });
tagSchema.index({ name: "text" });

module.exports = mongoose.model("Tag", tagSchema);
