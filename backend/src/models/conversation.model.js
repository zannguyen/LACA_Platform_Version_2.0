const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["direct", "public"],
      default: "direct",
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      default: null,
    },
    title: {
      type: String,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    lastMessage: {
      text: String,
      image: String,
      sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      isRead: { type: Boolean, default: false },
      createdAt: Date,
    },
  },
  { timestamps: true },
);

// Index for direct chats (2 participants)
conversationSchema.index({ type: 1, participants: 1 });
// Index for public chats (by postId)
conversationSchema.index({ type: 1, postId: 1 });

module.exports = mongoose.model("Conversation", conversationSchema);
