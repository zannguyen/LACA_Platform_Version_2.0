const mongoose = require("mongoose");

const CheckinSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    placeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Place",
      required: true,
    },

    note: {
      type: String,
      maxlength: 200,
      trim: true,
      default: "",
    },

    isPublic: {
      type: Boolean,
      default: true,
    },

    duration: {
      type: Number, // mongoose không có int riêng, Number OK (validator DB sẽ warn nếu không int)
      min: 1,
      max: 1440,
      default: 60,
    },

    photos: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) =>
          Array.isArray(arr) &&
          arr.every((u) => typeof u === "string" && /^https?:\/\/.+/.test(u)),
        message: "photos must be array of http(s) URLs",
      },
    },

    createdAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: false, // vì bạn đã quản lý createdAt theo validator
    versionKey: false,
  },
);

CheckinSchema.index({ userId: 1, createdAt: -1 });
CheckinSchema.index({ placeId: 1, createdAt: -1 });

module.exports = mongoose.model("Checkin", CheckinSchema, "checkins");
