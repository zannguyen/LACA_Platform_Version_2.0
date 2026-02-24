const mongoose = require("mongoose");

// Define schema - use simple ObjectId without refs to avoid validation issues
const reactionSchema = new mongoose.Schema({
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  type: {
    type: String,
    default: "like"
  }
}, { timestamps: true });

// Create compound unique index
reactionSchema.index({ postId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("Reaction", reactionSchema);
