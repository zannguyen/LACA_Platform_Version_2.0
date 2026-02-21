const Notification = require("../models/notification.model");

/**
 * Tạo và phát thông báo real-time.
 *
 * @param {object} io          - Socket.IO server instance (req.app.get("io"))
 * @param {object} payload
 * @param {string}   payload.recipientId   - ObjectId (string) người nhận
 * @param {string}   [payload.senderId]    - ObjectId (string) người gửi hành động
 * @param {string}   payload.type         - loại thông báo (NOTIFICATION_TYPES)
 * @param {string}   payload.title        - tiêu đề ngắn
 * @param {string}   [payload.body]       - nội dung chi tiết
 * @param {string}   [payload.link]       - đường dẫn FE
 * @param {string}   [payload.refId]      - _id của tài nguyên liên quan
 * @param {string}   [payload.refModel]   - "Post"|"Message"|"Conversation"|"User"
 * @returns {Promise<Notification>}
 */
const createAndEmit = async (io, payload) => {
  const {
    recipientId,
    senderId = null,
    type,
    title,
    body = "",
    link = "",
    refId = null,
    refModel = null,
  } = payload;

  // Không tự gửi thông báo cho chính mình
  if (senderId && String(senderId) === String(recipientId)) return null;

  const notification = await Notification.create({
    recipientId,
    senderId,
    type,
    title,
    body,
    link,
    refId,
    refModel,
  });

  // Populate sender info để FE hiển thị avatar / tên
  await notification.populate("senderId", "username fullname avatar");

  // Emit real-time qua Socket.IO đến phòng của người nhận
  if (io) {
    io.to(String(recipientId)).emit("notification", notification);
  }

  return notification;
};

/**
 * Gửi admin broadcast: tạo notification cho danh sách user IDs.
 * Nếu recipientIds rỗng => gửi cho tất cả (io.emit).
 */
const adminBroadcast = async (
  io,
  { recipientIds = [], title, body = "", link = "" },
) => {
  if (recipientIds.length === 0) {
    // Emit global (không lưu DB để tránh spam)
    if (io) {
      io.emit("notification", {
        type: "admin_broadcast",
        title,
        body,
        link,
        isRead: false,
        createdAt: new Date(),
      });
    }
    return { sent: "all" };
  }

  // Lưu DB và emit cho từng user
  const docs = recipientIds.map((recipientId) => ({
    recipientId,
    senderId: null,
    type: "admin_broadcast",
    title,
    body,
    link,
  }));

  const inserted = await Notification.insertMany(docs);

  if (io) {
    for (const doc of inserted) {
      io.to(String(doc.recipientId)).emit("notification", doc);
    }
  }

  return { sent: inserted.length };
};

/**
 * Lấy danh sách thông báo của user (phân trang).
 */
const getNotifications = async (userId, { page = 1, limit = 20 } = {}) => {
  const skip = (page - 1) * limit;
  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find({ recipientId: userId })
      .populate("senderId", "username fullname avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments({ recipientId: userId }),
    Notification.countDocuments({ recipientId: userId, isRead: false }),
  ]);

  return {
    notifications,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    unreadCount,
  };
};

/**
 * Đánh dấu một thông báo là đã đọc.
 */
const markOneAsRead = async (notificationId, userId) => {
  return Notification.findOneAndUpdate(
    { _id: notificationId, recipientId: userId },
    { isRead: true },
    { new: true },
  );
};

/**
 * Đánh dấu tất cả thông báo của user là đã đọc.
 */
const markAllAsRead = async (userId) => {
  const result = await Notification.updateMany(
    { recipientId: userId, isRead: false },
    { isRead: true },
  );
  return { updated: result.modifiedCount };
};

/**
 * Xoá một thông báo.
 */
const deleteOne = async (notificationId, userId) => {
  return Notification.findOneAndDelete({
    _id: notificationId,
    recipientId: userId,
  });
};

/**
 * Xoá tất cả thông báo đã đọc của user.
 */
const deleteReadAll = async (userId) => {
  const result = await Notification.deleteMany({
    recipientId: userId,
    isRead: true,
  });
  return { deleted: result.deletedCount };
};

/**
 * Đếm số thông báo chưa đọc (badge).
 */
const countUnread = async (userId) => {
  return Notification.countDocuments({ recipientId: userId, isRead: false });
};

/**
 * Upsert notification tin nhắn: chỉ giữ 1 notification/conversation chưa đọc.
 * Nếu đã tồn tại notification new_message từ senderId → recipientId chưa đọc
 * thì chỉ cập nhật body + updatedAt, KHÔNG tạo doc mới.
 * Sau đó emit Socket.IO để FE cập nhật badge.
 *
 * @param {object} io
 * @param {object} payload  - { recipientId, senderId, senderName, previewText, conversationId }
 */
const upsertMessageNotif = async (
  io,
  { recipientId, senderId, senderName, previewText, conversationId },
) => {
  if (String(senderId) === String(recipientId)) return null;

  const filter = {
    recipientId,
    senderId,
    type: "new_message",
    isRead: false,
    // Dùng refId để nhận dạng conversation
    refId: conversationId,
    refModel: "Conversation",
  };

  const update = {
    $set: {
      title: `${senderName} gửi cho bạn tin nhắn mới`,
      body: previewText,
      link: `/chat/${senderId}`,
      // Reset expireAt mỗi lần nhắn để không bị xoá sớm
      expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    $setOnInsert: {
      recipientId,
      senderId,
      type: "new_message",
      refId: conversationId,
      refModel: "Conversation",
      isRead: false,
    },
  };

  const doc = await Notification.findOneAndUpdate(filter, update, {
    upsert: true,
    new: true,
  });

  await doc.populate("senderId", "username fullname avatar");

  // Emit để FE cập nhật badge (không phải pop-up spam)
  if (io) {
    io.to(String(recipientId)).emit("notification", doc);
  }

  return doc;
};

module.exports = {
  createAndEmit,
  upsertMessageNotif,
  adminBroadcast,
  getNotifications,
  markOneAsRead,
  markAllAsRead,
  deleteOne,
  deleteReadAll,
  countUnread,
};
