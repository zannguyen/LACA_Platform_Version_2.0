const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const { requireAdmin } = require("../middlewares/requireAdmin");
const ctrl = require("../controllers/notification.controller");

// ── User routes (phải đăng nhập) ──────────────────────────────────────────

/** Lấy danh sách thông báo của tôi (phân trang) */
router.get("/", auth, ctrl.getMyNotifications);

/** Số thông báo chưa đọc (dùng cho badge) */
router.get("/unread-count", auth, ctrl.getUnreadCount);

/** Đánh dấu TẤT CẢ là đã đọc */
router.patch("/read-all", auth, ctrl.markAllRead);

/** Xoá tất cả thông báo đã đọc */
router.delete("/read-all", auth, ctrl.clearReadNotifications);

/** Đánh dấu một thông báo là đã đọc */
router.patch("/:id/read", auth, ctrl.markOneRead);

/** Xoá một thông báo */
router.delete("/:id", auth, ctrl.deleteNotification);

// ── Admin routes ───────────────────────────────────────────────────────────

/**
 * Gửi thông báo broadcast từ admin.
 * Body: { recipientIds?: [ObjectId,...], title: string, body?: string, link?: string }
 * Nếu recipientIds rỗng => emit global (không lưu DB).
 */
router.post("/admin/broadcast", auth, requireAdmin, ctrl.adminBroadcast);

module.exports = router;
