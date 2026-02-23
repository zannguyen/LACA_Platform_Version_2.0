// backend/src/models/broadcastHistory.model.js
const mongoose = require("mongoose");

const broadcastHistorySchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 200,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      maxlength: 1000,
      trim: true,
    },
    link: {
      type: String,
      default: null,
    },
    recipientCount: {
      type: Number,
      default: 0,
    },
    deliveredCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["pending", "sending", "completed", "failed"],
      default: "pending",
    },
    sentAt: {
      type: Date,
      default: null,
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast queries
broadcastHistorySchema.index({ adminId: 1, sentAt: -1 });
broadcastHistorySchema.index({ status: 1 });

module.exports = mongoose.model("BroadcastHistory", broadcastHistorySchema);
