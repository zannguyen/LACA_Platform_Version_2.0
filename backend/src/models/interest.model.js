const mongoose = require("mongoose");

const interestSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  description: {
    type: String,
    default: "",
  },
  icon: {
    type: {
      type: String,
      enum: ["emoji", "image"],
      default: "emoji",
    },
    value: {
      type: String,
      required: true,
    },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Interest", interestSchema);
