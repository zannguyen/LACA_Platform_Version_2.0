const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    placeId: { type: mongoose.Schema.Types.ObjectId, ref: "Place" },
    content: String,
    type: String,
    status: String,

    mediaUrl: [String], // <-- BẮT BUỘC

    reportCount: { type: Number, default: 0 },
    expireAt: Date,
    analysisId: { type: mongoose.Schema.Types.ObjectId, ref: "PostAnalysis" },
    tags: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tag" }], // Tags selected by user when posting
  },
  { timestamps: true },
);
delete mongoose.models.Post;
module.exports = mongoose.model("Post", schema);
