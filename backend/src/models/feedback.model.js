const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true, // Tạo index để query nhanh hơn
    },
    content: {
      type: String,
      required: [true, "Vui lòng nhập nội dung góp ý"],
      trim: true,
    },
    type: {
      type: String,
      enum: ["feedback", "report"], // Chỉ cho phép 2 loại này
      default: "feedback",
    },
    status: {
      type: String,
      enum: ["new", "read", "resolved"],
      default: "new",
    },
  },
  {
    timestamps: true, // Tự động tạo trường createdAt và updatedAt
  },
);

module.exports = mongoose.model("Feedback", feedbackSchema);
