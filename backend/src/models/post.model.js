const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    userId: mongoose.Schema.Types.ObjectId,
    placeId: mongoose.Schema.Types.ObjectId,
    content: String,
    type: String,
    status: String,

    mediaUrl: [String], // <-- BẮT BUỘC

    reportCount: { type: Number, default: 0 },
    expireAt: Date,
  },
  { timestamps: true },
);
delete mongoose.models.Post;
module.exports = mongoose.model("Post", schema);
