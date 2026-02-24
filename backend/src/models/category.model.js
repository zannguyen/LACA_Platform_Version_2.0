const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      unique: true,
      trim: true,
      lowercase: true,
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

// Index for faster queries
categorySchema.index({ isActive: 1 });
categorySchema.index({ name: "text" });

module.exports = mongoose.model("Category", categorySchema);
