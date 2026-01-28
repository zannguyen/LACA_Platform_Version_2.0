const mongoose = require("mongoose");
const { Schema } = mongoose;

const placeSchema = new Schema(
  {
    googlePlaceId: {
      type: String,
      trim: true,
      description: "Google Places ID",
    },

    name: {
      type: String,
      required: true,
      minlength: 2,
      trim: true,
      description: "Place name",
    },

    address: {
      type: String,
      required: true,
      trim: true,
      description: "Physical address",
    },

    category: {
      type: String,
      enum: [
        "cafe",
        "restaurant",
        "bar",
        "shop",
        "park",
        "museum",
        "hotel",
        "other",
      ],
      default: "other",
      description: "Place category",
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true,
        validate: {
          validator: (val) =>
            Array.isArray(val) &&
            val.length === 2 &&
            val.every((v) => typeof v === "number"),
          message: "Coordinates must be [lng, lat]",
        },
      },
    },

    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

/* ================= INDEX ================= */

placeSchema.index({ location: "2dsphere" });

// Optional: nếu dùng Google Places API
placeSchema.index({ googlePlaceId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Place", placeSchema);
