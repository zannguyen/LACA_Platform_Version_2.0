const mongoose = require("mongoose");
const Conversation = require("../models/conversation.model");
const Message = require("../models/message.model");
const User = require("../models/user.model");
const asyncHandler = require("../utils/asyncHandler");

const toObjectId = (v) => {
  try {
    return new mongoose.Types.ObjectId(String(v));
  } catch {
    return null;
  }
};

// 1) Send message
const sendMessage = asyncHandler(async (req, res) => {
  const { receiverId, text, image } = req.body;

  const senderId = req.user?._id; // ✅ giờ middleware đã set _id
  const rid = toObjectId(receiverId);

  if (!senderId) {
    return res.status(401).json({ message: "Unauthorized: missing sender" });
  }
  if (!rid) {
    return res.status(400).json({ message: "receiverId invalid" });
  }
  if (!text?.trim() && !image?.trim()) {
    return res
      .status(400)
      .json({ message: "Message text or image is required" });
  }

  // A) Find or create conversation
  let conversation = await Conversation.findOne({
    participants: { $all: [senderId, rid] },
  });

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [senderId, rid],
    });
  }

  // B) Create message
  const newMessage = await Message.create({
    conversationId: conversation._id,
    senderId,
    text: text || "",
    image: image || "",
  });

  // C) Update lastMessage
  await Conversation.findByIdAndUpdate(conversation._id, {
    lastMessage: {
      text: text?.trim() ? text : "Đã gửi một ảnh",
      sender: senderId,
      isRead: false,
      createdAt: new Date(),
    },
  });

  // D) Emit realtime
  const io = req.app.get("io");
  if (io) {
    io.to(String(rid)).emit("receive_message", newMessage); // ✅ emit theo room userId
  }

  return res.status(200).json(newMessage);
});

// 2) Get messages with receiver
const getMessages = asyncHandler(async (req, res) => {
  const { receiverId } = req.params;
  const senderId = req.user?._id;
  const rid = toObjectId(receiverId);

  if (!senderId) return res.status(401).json({ message: "Unauthorized" });
  if (!rid) return res.status(400).json({ message: "receiverId invalid" });

  const conversation = await Conversation.findOne({
    participants: { $all: [senderId, rid] },
  });

  if (!conversation) return res.status(200).json([]);

  const messages = await Message.find({
    conversationId: conversation._id,
  }).sort({ createdAt: 1 });

  return res.status(200).json(messages);
});

// 3) Get conversations
const getConversations = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const conversations = await Conversation.find({
    participants: { $in: [userId] },
  })
    .populate("participants", "username fullname avatar")
    .sort({ updatedAt: -1 });

  return res.status(200).json(conversations);
});

// 4) Search users
const searchUsers = asyncHandler(async (req, res) => {
  const { query } = req.query;
  const currentUserId = req.user?._id;

  if (!currentUserId) return res.status(401).json({ message: "Unauthorized" });
  if (!query)
    return res.status(400).json({ message: "Vui lòng nhập từ khóa tìm kiếm" });

  const users = await User.find({
    $and: [
      { _id: { $ne: currentUserId } },
      {
        $or: [
          { username: { $regex: query, $options: "i" } },
          { fullname: { $regex: query, $options: "i" } },
          { email: { $regex: query, $options: "i" } },
        ],
      },
    ],
  })
    .select("_id username fullname email avatar")
    .limit(10);

  return res.status(200).json(users);
});

// 5) Get or create conversation
const getOrCreateConversation = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const currentUserId = req.user?._id;
  const otherId = toObjectId(userId);

  if (!currentUserId) return res.status(401).json({ message: "Unauthorized" });
  if (!otherId) return res.status(400).json({ message: "userId invalid" });

  if (String(currentUserId) === String(otherId)) {
    return res
      .status(400)
      .json({ message: "Không thể tạo conversation với chính mình" });
  }

  let conversation = await Conversation.findOne({
    participants: { $all: [currentUserId, otherId] },
  }).populate("participants", "username fullname avatar");

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [currentUserId, otherId],
    });
    await conversation.populate("participants", "username fullname avatar");
  }

  return res.status(200).json(conversation);
});

// 6) Mark messages as read
const markRead = asyncHandler(async (req, res) => {
  const { receiverId } = req.params;
  const currentUserId = req.user?._id;
  const rid = toObjectId(receiverId);

  if (!currentUserId) return res.status(401).json({ message: "Unauthorized" });
  if (!rid) return res.status(400).json({ message: "receiverId invalid" });

  const conversation = await Conversation.findOne({
    participants: { $all: [currentUserId, rid] },
  });

  if (!conversation) return res.status(200).json({ updated: 0 });

  const result = await Message.updateMany(
    {
      conversationId: conversation._id,
      senderId: { $ne: currentUserId },
      isRead: false,
    },
    { $set: { isRead: true } },
  );

  if (
    conversation.lastMessage?.sender &&
    String(conversation.lastMessage.sender) !== String(currentUserId)
  ) {
    await Conversation.findByIdAndUpdate(conversation._id, {
      "lastMessage.isRead": true,
    });
  }

  const io = req.app.get("io");
  if (io) {
    const otherId = conversation.participants.find(
      (id) => String(id) !== String(currentUserId),
    );
    if (otherId) {
      io.to(String(otherId)).emit("messages_read", {
        conversationId: String(conversation._id),
        readerId: String(currentUserId),
      });
    }
  }

  return res.status(200).json({ updated: result.modifiedCount || 0 });
});

module.exports = {
  sendMessage,
  getMessages,
  getConversations,
  searchUsers,
  getOrCreateConversation,
  markRead,
};
