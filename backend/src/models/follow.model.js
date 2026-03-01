const mongoose = require("mongoose");

/**
 * One-way follow relationship:
 *   followerUserId -> followingUserId
 */
const followSchema = new mongoose.Schema(
  {
    followerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    followingUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

// Prevent duplicates (A follows B only once)
followSchema.index({ followerUserId: 1, followingUserId: 1 }, { unique: true });

module.exports = mongoose.model("Follow", followSchema);
