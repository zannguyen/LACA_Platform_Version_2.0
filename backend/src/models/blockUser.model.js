const mongoose = require("mongoose");

const blockUserSchema = new mongoose.Schema(
  {
    blockerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    blockedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

blockUserSchema.index(
  { blockerUserId: 1, blockedUserId: 1 },
  { unique: true },
);


module.exports = mongoose.model("BlockUser", blockUserSchema);
