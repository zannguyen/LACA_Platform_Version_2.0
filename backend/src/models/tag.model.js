const mongoose = require("mongoose");

const tagSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Tag name is required"],
      trim: true,
      lowercase: true,
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
 * Normalize tag name before saving
 * - trim whitespace
 * - lowercase
 * - remove multiple spaces (replace with single space)
 */
tagSchema.pre("save", async function () {
  if (this.name) {
    this.name = this.name.trim().toLowerCase()
  }
})

// Index for faster queries - UNIQUE per category
tagSchema.index({ categoryId: 1, name: 1 }, { unique: true });
tagSchema.index({ categoryId: 1, isActive: 1 });
tagSchema.index({ name: "text" });

module.exports = mongoose.model("Tag", tagSchema);
