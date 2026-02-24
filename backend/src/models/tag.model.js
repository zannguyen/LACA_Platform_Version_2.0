const mongoose = require("mongoose");

const tagSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Tag name is required"],
      unique: true,
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

// Index for faster queries
tagSchema.index({ categoryId: 1, isActive: 1 });
tagSchema.index({ name: "text" });

module.exports = mongoose.model("Tag", tagSchema);
