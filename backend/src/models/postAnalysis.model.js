const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      unique: true,
    },
    topics: [String], // Array of extracted topics
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.5,
    },
    summary: String, // Brief analysis summary
    analyzedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index for fast lookups
schema.index({ postId: 1 });
schema.index({ createdAt: -1 }); // For trending queries

delete mongoose.models.PostAnalysis;
module.exports = mongoose.model("PostAnalysis", schema);
