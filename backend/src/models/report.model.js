const mongoose = require("mongoose");

const ReportSchema = new mongoose.Schema(
  {
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    targetType: {
      type: String,
      enum: ["post", "user", "place"],
      required: true,
    },

    reason: {
      type: String,
      required: true,
      minlength: 5,
      maxlength: 500,
      trim: true,
    },

    category: {
      type: String,
      enum: ["spam", "harassment", "inappropriate", "false_info", "other"],
      default: "other",
    },

    description: {
      type: String,
      maxlength: 1000,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: ["pending", "reviewed", "dismissed"],
      required: true,
      default: "pending",
    },

    actionTaken: {
      type: String,
      enum: [
        "none",
        "warned",
        "post_hidden",
        "post_deleted",
        "user_banned",
        "place_hidden",
      ],
      default: "none",
    },

    handledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    handledAt: { type: Date },

    note: {
      type: String,
      maxlength: 500,
      trim: true,
      default: "",
    },

    createdAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { timestamps: false, versionKey: false },
);

ReportSchema.index({ status: 1, createdAt: -1 });
ReportSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
ReportSchema.index({ reporterId: 1, createdAt: -1 });

module.exports = mongoose.model("Report", ReportSchema, "reports");
