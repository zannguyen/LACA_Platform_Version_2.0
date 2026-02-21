const mongoose = require("mongoose");

/**
 * Notification Types:
 *  - new_post        : người bạn follow đăng bài mới
 *  - new_message     : có tin nhắn mới
 *  - new_follower    : ai đó follow bạn
 *  - new_reaction    : ai đó react bài viết của bạn
 *  - new_comment     : ai đó comment bài viết của bạn (future)
 *  - admin_broadcast : thông báo từ admin gửi đến tất cả / một nhóm user
 *  - system          : thông báo hệ thống (tài khoản bị suspend, xác minh email, …)
 */

const NOTIFICATION_TYPES = [
  "new_post",
  "new_message",
  "new_follower",
  "new_reaction",
  "new_comment",
  "admin_broadcast",
  "system",
];

const notificationSchema = new mongoose.Schema(
  {
    /** Người nhận thông báo */
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    /** Người thực hiện hành động (null nếu là admin/system broadcast) */
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
    },

    /** Tiêu đề ngắn hiển thị lên notification */
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },

    /** Nội dung chi tiết */
    body: {
      type: String,
      default: "",
      maxlength: 1000,
    },

    /** Link điều hướng phía FE (optional) */
    link: {
      type: String,
      default: "",
    },

    /** Id tài nguyên liên quan (postId, messageId, …) */
    refId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    /** Model name tương ứng với refId */
    refModel: {
      type: String,
      enum: ["Post", "Message", "Conversation", "User", null],
      default: null,
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    /** Để xoá tự động sau một khoảng thời gian (TTL index) */
    expireAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 ngày
      index: { expireAfterSeconds: 0 },
    },
  },
  { timestamps: true },
);

// Index phổ biến khi query
notificationSchema.index({ recipientId: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, isRead: 1 });

module.exports = mongoose.model("Notification", notificationSchema);
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
