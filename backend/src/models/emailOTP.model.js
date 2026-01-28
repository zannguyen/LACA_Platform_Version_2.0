const mongoose = require("mongoose");

const emailOTPSchema = new mongoose.Schema(
  {
    otpToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
      index: true,
    },

    otp: {
      type: String,
      required: true,
    },

    // ✅ DEFINE purpose ở đây
    purpose: {
      type: String,
      enum: ["REGISTER", "RESET_PASSWORD"],
      required: true,
      default: "REGISTER",
      index: true,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    isUsed: {
      type: Boolean,
      default: false,
      index: true,
    },

    attempts: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("EmailOTP", emailOTPSchema);
