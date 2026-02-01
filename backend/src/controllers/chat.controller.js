const Conversation = require('../models/conversation.model');
const Message = require('../models/message.model');
const asyncHandler = require('../utils/asyncHandler');

// 1. Gửi tin nhắn (Hỗ trợ cả text và ảnh)
const sendMessage = asyncHandler(async (req, res) => {
  const { receiverId, text, image } = req.body;
  const senderId = req.user._id; // Lấy từ middleware xác thực

  // A. Tìm hoặc tạo cuộc trò chuyện
  let conversation = await Conversation.findOne({
    participants: { $all: [senderId, receiverId] }
  });

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [senderId, receiverId]
    });
  }

  // B. Tạo tin nhắn mới
  const newMessage = await Message.create({
    conversationId: conversation._id,
    senderId,
    text: text || "",
    image: image || ""
  });

  // C. Cập nhật tin nhắn cuối cùng cho Conversation
  await Conversation.findByIdAndUpdate(conversation._id, {
    lastMessage: {
      text: text || "Đã gửi một ảnh",
      sender: senderId,
      isRead: false,
      createdAt: new Date()
    }
  });

  // D. Bắn Socket Real-time
  const io = req.app.get('io');
  if (io) {
    io.to(receiverId).emit('receive_message', newMessage);
  }

  res.status(200).json(newMessage);
});

// 2. Lấy danh sách tin nhắn của 1 cuộc hội thoại
const getMessages = asyncHandler(async (req, res) => {
  const { receiverId } = req.params;
  const senderId = req.user._id;

  const conversation = await Conversation.findOne({
    participants: { $all: [senderId, receiverId] }
  });

  if (!conversation) return res.status(200).json([]);

  const messages = await Message.find({
    conversationId: conversation._id
  }).sort({ createdAt: 1 });

  res.status(200).json(messages);
});

// 3. Lấy danh sách các cuộc trò chuyện (Menu bên trái)
const getConversations = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const conversations = await Conversation.find({
    participants: { $in: [userId] }
  })
  .populate('participants', 'username fullname avatar') // Lấy thông tin User để hiển thị
  .sort({ updatedAt: -1 });

  res.status(200).json(conversations);
});

module.exports = { sendMessage, getMessages, getConversations };