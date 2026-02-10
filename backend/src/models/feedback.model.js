const mongoose = require("mongoose");

const FeedbackSchema = new mongoose.Schema(
  {
    // ai gửi
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // loại feedback
    type: {
      type: String,
      enum: ["bug", "feature", "complaint", "question", "other"],
      default: "other",
      index: true,
    },

    // tiêu đề (optional)
    title: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },

    // nội dung chính
    message: {
      type: String,
      trim: true,
      required: true,
      minlength: 3,
      maxlength: 2000,
    },

    // mức độ hài lòng (optional)
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },

    // trạng thái xử lý
    status: {
      type: String,
      enum: ["new", "reviewed", "resolved"],
      default: "new",
      index: true,
    },

    // admin xử lý
    handledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    handledAt: {
      type: Date,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    // meta (optional)
    source: {
      type: String,
      enum: ["web", "mobile", "admin", "other"],
      default: "web",
    },
    device: { type: String, trim: true, maxlength: 200, default: "" },
    appVersion: { type: String, trim: true, maxlength: 50, default: "" },

    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    // feedbacks chưa có validator nên bạn có thể bật timestamps cũng được,
    // nhưng để đồng bộ với reports/checkins, mình dùng createdAt thủ công.
    timestamps: false,
    versionKey: false,
  },
);

FeedbackSchema.index({ status: 1, createdAt: -1 });
FeedbackSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model("Feedback", FeedbackSchema, "feedbacks");
