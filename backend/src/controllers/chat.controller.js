const mongoose = require("mongoose");
const Conversation = require("../models/conversation.model");
const Message = require("../models/message.model");
const User = require("../models/user.model");
const asyncHandler = require("../utils/asyncHandler");
const notifService = require("../services/notification.service");

const toObjectId = (v) => {
  try {
    return new mongoose.Types.ObjectId(String(v));
  } catch {
    return null;
  }
};

// Helper function to generate conversation title from post content
const generateConversationTitle = (postContent) => {
  if (!postContent) return null;
  // Take first 50 characters and add ellipsis if longer
  const maxLength = 50;
  if (postContent.length > maxLength) {
    return postContent.substring(0, maxLength) + "...";
  }
  return postContent;
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
  })
    .populate("senderId", "username fullname avatar")
    .sort({ createdAt: 1 });

  return res.status(200).json(messages);
});

// 3) Get conversations (both private and public that user joined)
const getConversations = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const userIdStr = String(userId);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  console.log(`=== getConversations for user ${userIdStr} ===`);

  // First, get ALL conversations to debug
  const allConvs = await Conversation.find({});
  console.log(`Total conversations in DB: ${allConvs.length}`);
  allConvs.forEach((c) => {
    const pIds = c.participants.map((p) => String(p));
    const hasUser = pIds.includes(userIdStr);
    console.log(
      `  - ${c._id} | type: ${c.type} | participants: [${pIds.join(", ")}] | hasUser: ${hasUser}`,
    );
  });

  // Try querying with string version
  const conversations = await Conversation.find({
    participants: { $in: [userIdStr, userId] },
  })
    .populate("participants", "username fullname avatar")
    .populate("postId", "_id content") // Populate postId to get ID and post content
    .sort({ updatedAt: -1 });

  console.log(`Final result: ${conversations.length} conversations`);
  console.log(
    "Conversation types:",
    conversations.map((c) => ({
      type: c.type,
      postId: c.postId,
      _id: String(c._id),
      participantIds: c.participants.map((p) => String(p._id)),
    })),
  );

  return res.status(200).json(conversations);
});

// 4) Search users
const searchUsers = asyncHandler(async (req, res) => {
  const { query } = req.query;
  const currentUserId = req.user?._id;

  if (!currentUserId) return res.status(401).json({ message: "Unauthorized" });
  if (!query)
    return res.status(400).json({ message: "Vui lòng nhập từ khóa tìm kiếm" });

  const searchQuery = query.trim().toLowerCase();
  console.log("Search query:", searchQuery, "currentUserId:", currentUserId);

  // First, let's find ALL users that match the email (for debugging)
  const allByEmail = await User.find({
    email: { $regex: searchQuery, $options: 'i' }
  }).select("_id username email").limit(5);
  console.log("Users matching email:", allByEmail.length, allByEmail.map(u => ({ id: u._id, email: u.email })));

  // Build search filter
  const searchFilter = {
    $or: [
      { username: { $regex: searchQuery, $options: 'i' } },
      { fullname: { $regex: searchQuery, $options: 'i' } },
      { email: { $regex: searchQuery, $options: 'i' } },
    ],
  };

  // Exclude current user
  const users = await User.find({
    _id: { $ne: currentUserId },
    ...searchFilter
  })
    .select("_id username fullname email avatar")
    .limit(10);

  console.log("Found users (excluding self):", users.length);

  // Get follow status for each user
  const Follow = require("../models/follow.model");
  const userIds = users.map(u => u._id);
  const follows = await Follow.find({
    followerUserId: currentUserId,
    followingUserId: { $in: userIds }
  }).lean();

  const followingIds = new Set(follows.map(f => String(f.followingUserId)));

  // Add isFollowing to each user
  const usersWithFollowStatus = users.map(user => ({
    _id: user._id,
    username: user.username,
    fullname: user.fullname,
    email: user.email,
    avatar: user.avatar,
    isFollowing: followingIds.has(String(user._id))
  }));

  return res.status(200).json(usersWithFollowStatus);
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

// 7) Mark a conversation as read by conversationId
const markConversationRead = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const currentUserId = req.user?._id;
  const cid = toObjectId(conversationId);

  if (!currentUserId) return res.status(401).json({ message: "Unauthorized" });
  if (!cid) return res.status(400).json({ message: "conversationId invalid" });

  const conversation = await Conversation.findById(cid);
  if (!conversation) return res.status(404).json({ message: "Conversation not found" });

  const isParticipant = conversation.participants.some(
    (participantId) => String(participantId) === String(currentUserId),
  );
  if (!isParticipant) {
    return res
      .status(403)
      .json({ message: "Bạn không thuộc cuộc trò chuyện này" });
  }

  if (
    conversation.lastMessage?.sender &&
    String(conversation.lastMessage.sender) !== String(currentUserId) &&
    conversation.lastMessage.isRead === false
  ) {
    await Conversation.findByIdAndUpdate(conversation._id, {
      "lastMessage.isRead": true,
    });
  }

  return res.status(200).json({ updated: 1 });
});

// 7) Delete conversation
const deleteConversation = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user?._id;
  const cid = toObjectId(conversationId);

  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  if (!cid) return res.status(400).json({ message: "conversationId invalid" });

  const conversation = await Conversation.findById(cid);
  if (!conversation) {
    return res.status(404).json({ message: "Không tìm thấy cuộc trò chuyện" });
  }

  const isParticipant = conversation.participants.some(
    (participantId) => String(participantId) === String(userId),
  );

  if (!isParticipant) {
    return res
      .status(403)
      .json({ message: "Bạn không có quyền xóa cuộc trò chuyện này" });
  }

  if (conversation.type === "public") {
    conversation.participants = conversation.participants.filter(
      (participantId) => String(participantId) !== String(userId),
    );

    if (conversation.participants.length === 0) {
      await Message.deleteMany({ conversationId: conversation._id });
      await Conversation.deleteOne({ _id: conversation._id });
      return res.status(200).json({ deleted: true, mode: "public_removed" });
    }

    await conversation.save();
    return res.status(200).json({ deleted: true, mode: "public_left" });
  }

  await Message.deleteMany({ conversationId: conversation._id });
  await Conversation.deleteOne({ _id: conversation._id });

  return res.status(200).json({ deleted: true, mode: "direct_deleted" });
});

// 7) Join public chat for a post
const joinPublicChat = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const userId = req.user?._id;
  const pid = toObjectId(postId);

  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  if (!pid) return res.status(400).json({ message: "postId invalid" });

  console.log(`User ${userId} joining public chat for post ${postId}`);

  // Get post to generate title
  const Post = require("../models/post.model");
  const post = await Post.findById(pid);
  const postTitle = generateConversationTitle(post?.content);

  // Find existing public conversation for this post
  let conversation = await Conversation.findOne({
    type: "public",
    postId: pid,
  });

  console.log(`Found conversation: ${conversation?._id || "none"}`);
  console.log(
    `Current participants in DB: ${conversation?.participants || "N/A"}`,
  );

  if (!conversation) {
    // Create new conversation with user as participant
    console.log(
      `Creating new public conversation for post ${postId} with user ${userId}`,
    );
    conversation = await Conversation.create({
      type: "public",
      postId: pid,
      createdBy: userId,
      title: postTitle,
      participants: [userId], // Ensure user is added here
    });
    console.log(`Created conversation _id: ${conversation._id}`);
  } else if (!conversation.title && postTitle) {
    // If conversation exists but doesn't have a title yet, set it
    conversation.title = postTitle;
    await conversation.save();
  }

  // Check if user is in participants array (handle both populated and non-populated)
  const participantIds = conversation.participants.map((p) =>
    typeof p === "object" ? String(p._id) : String(p),
  );
  const userIdStr = String(userId);

  console.log(`Participant IDs: ${participantIds.join(", ")}`);
  console.log(`User ID: ${userIdStr}`);
  console.log(`User in participants: ${participantIds.includes(userIdStr)}`);

  if (!participantIds.includes(userIdStr)) {
    console.log(`Adding user ${userId} to participants`);
    conversation.participants.push(userId);
    await conversation.save();
    console.log(`Saved! Participants now: ${conversation.participants}`);
  }

  // Populate and return
  await conversation.populate("participants", "username fullname avatar");
  console.log(`Final participants: ${conversation.participants.length}`);

  return res.status(200).json(conversation);
});

// 8) Send message to public chat
const sendPublicMessage = asyncHandler(async (req, res) => {
  const { postId, text, image } = req.body;
  const senderId = req.user?._id;
  const pid = toObjectId(postId);

  if (!senderId) return res.status(401).json({ message: "Unauthorized" });
  if (!pid) return res.status(400).json({ message: "postId invalid" });
  if (!text?.trim() && !image?.trim()) {
    return res
      .status(400)
      .json({ message: "Message text or image is required" });
  }

  // Find public conversation for this post
  let conversation = await Conversation.findOne({
    type: "public",
    postId: pid,
  });

  // Get post to find owner and generate title
  const Post = require("../models/post.model");
  const post = await Post.findById(pid);
  const postOwnerId = post?.userId;
  const postTitle = generateConversationTitle(post?.content);

  // Build participants list - add sender AND post owner (if different)
  const participantsToAdd = [senderId];
  if (postOwnerId && String(postOwnerId) !== String(senderId)) {
    participantsToAdd.push(postOwnerId);
  }

  if (!conversation) {
    // Create new conversation with participants
    conversation = await Conversation.create({
      type: "public",
      postId: pid,
      createdBy: senderId,
      title: postTitle,
      participants: participantsToAdd,
    });
  } else {
    // Add participants if not already in the list
    const currentParticipantIds = conversation.participants.map((p) =>
      String(p),
    );
    let hasChanges = false;

    for (const userId of participantsToAdd) {
      if (!currentParticipantIds.includes(String(userId))) {
        conversation.participants.push(userId);
        hasChanges = true;
      }
    }

    // If conversation exists but doesn't have a title yet, set it
    if (!conversation.title && postTitle) {
      conversation.title = postTitle;
      hasChanges = true;
    }

    if (hasChanges) {
      await conversation.save();
    }
  }

  // Create message
  const newMessage = await Message.create({
    conversationId: conversation._id,
    senderId,
    postId: pid,
    text: text || "",
    image: image || "",
  });

  // Populate sender info before emitting and responding
  await newMessage.populate("senderId", "username fullname avatar");

  // Update lastMessage
  await Conversation.findByIdAndUpdate(conversation._id, {
    lastMessage: {
      text: text?.trim() ? text : "Đã gửi một ảnh",
      sender: senderId,
      isRead: false,
      createdAt: new Date(),
    },
  });

  // Emit to all users in post chat room (with populated sender)
  const io = req.app.get("io");
  if (io) {
    io.to(`post_${String(pid)}`).emit("receive_message", newMessage);
  }

  return res.status(200).json(newMessage);
});

// 9) Get all messages for a post chat
const getPublicMessages = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const userId = req.user?._id;
  const pid = toObjectId(postId);

  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  if (!pid) return res.status(400).json({ message: "postId invalid" });

  const conversation = await Conversation.findOne({
    type: "public",
    postId: pid,
  });

  if (!conversation) return res.status(200).json([]);

  const messages = await Message.find({
    conversationId: conversation._id,
  })
    .populate("senderId", "username fullname avatar")
    .sort({ createdAt: 1 });

  return res.status(200).json(messages);
});

// 10) Get participants in public chat
const getPublicParticipants = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const userId = req.user?._id;
  const pid = toObjectId(postId);

  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  if (!pid) return res.status(400).json({ message: "postId invalid" });

  const conversation = await Conversation.findOne({
    type: "public",
    postId: pid,
  }).populate("participants", "username fullname avatar");

  if (!conversation) return res.status(200).json([]);

  // Get post to find owner
  const Post = require("../models/post.model");
  const post = await Post.findById(pid).select("userId");
  const postOwnerId = post?.userId;

  // Add role to each participant
  const participantsWithRole = conversation.participants.map((participant) => ({
    ...participant.toObject(),
    role:
      String(participant._id) === String(postOwnerId)
        ? "post_owner"
        : "participant",
  }));

  return res.status(200).json(participantsWithRole);
});

// 11) Leave public chat
const leavePublicChat = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const userId = req.user?._id;
  const pid = toObjectId(postId);

  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  if (!pid) return res.status(400).json({ message: "postId invalid" });

  const conversation = await Conversation.findOne({
    type: "public",
    postId: pid,
  });

  if (!conversation) return res.status(200).json({ removed: false });

  // Remove user from participants
  conversation.participants = conversation.participants.filter(
    (p) => String(p) !== String(userId),
  );
  await conversation.save();

  // Emit user_left event
  const io = req.app.get("io");
  if (io) {
    io.to(`post_${String(pid)}`).emit("user_left", {
      userId: String(userId),
      participantCount: conversation.participants.length,
    });
  }

  return res.status(200).json({ removed: true });
});

// 12) Auto-join public chat if user is post owner
const joinPublicChatIfOwner = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const userId = req.user?._id;
  const pid = toObjectId(postId);

  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  if (!pid) return res.status(400).json({ message: "postId invalid" });

  // Get post to check owner
  const Post = require("../models/post.model");
  const post = await Post.findById(pid);

  if (!post) {
    return res.status(404).json({ message: "Bài viết không tồn tại" });
  }

  const isOwner = String(post.userId) === String(userId);

  if (!isOwner) {
    return res.status(403).json({
      message: "Chỉ chủ bài viết mới có thể tự động tham gia",
      isOwner: false,
    });
  }

  // User is owner - join/create public chat
  console.log(
    `Post owner ${userId} auto-joining public chat for post ${postId}`,
  );

  let conversation = await Conversation.findOne({
    type: "public",
    postId: pid,
  });

  if (!conversation) {
    console.log(`Creating new public conversation for post ${postId}`);
    conversation = await Conversation.create({
      type: "public",
      postId: pid,
      createdBy: userId,
      participants: [userId],
    });
  }

  // Check if user is in participants
  const participantIds = conversation.participants.map((p) =>
    typeof p === "object" ? String(p._id) : String(p),
  );

  if (!participantIds.includes(String(userId))) {
    console.log(`Adding owner ${userId} to participants`);
    conversation.participants.push(userId);
    await conversation.save();
  }

  await conversation.populate("participants", "username fullname avatar");

  return res.status(200).json({
    joined: true,
    isOwner: true,
    conversation,
  });
});

module.exports = {
  sendMessage,
  getMessages,
  getConversations,
  searchUsers,
  getOrCreateConversation,
  markRead,
  markConversationRead,
  deleteConversation,
  joinPublicChat,
  joinPublicChatIfOwner,
  sendPublicMessage,
  getPublicMessages,
  getPublicParticipants,
  leavePublicChat,
};
