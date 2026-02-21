const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/appError");
const notifService = require("../services/notification.service");
const mongoose = require("mongoose");

// ─────────────────────────────────────────────
// GET /api/notifications?page=1&limit=20
// ─────────────────────────────────────────────
const getMyNotifications = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));

  const result = await notifService.getNotifications(userId, { page, limit });
  return res.status(200).json({ success: true, ...result });
});

// ─────────────────────────────────────────────
// GET /api/notifications/unread-count
// ─────────────────────────────────────────────
const getUnreadCount = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const count = await notifService.countUnread(userId);
  return res.status(200).json({ success: true, unreadCount: count });
});

// ─────────────────────────────────────────────
// PATCH /api/notifications/:id/read
// ─────────────────────────────────────────────
const markOneRead = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id))
    throw new AppError("Invalid notification id", 400);

  const updated = await notifService.markOneAsRead(id, userId);
  if (!updated) throw new AppError("Notification not found", 404);

  return res.status(200).json({ success: true, data: updated });
});

// ─────────────────────────────────────────────
// PATCH /api/notifications/read-all
// ─────────────────────────────────────────────
const markAllRead = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const result = await notifService.markAllAsRead(userId);
  return res.status(200).json({ success: true, ...result });
});

// ─────────────────────────────────────────────
// DELETE /api/notifications/:id
// ─────────────────────────────────────────────
const deleteNotification = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id))
    throw new AppError("Invalid notification id", 400);

  const deleted = await notifService.deleteOne(id, userId);
  if (!deleted) throw new AppError("Notification not found", 404);

  return res
    .status(200)
    .json({ success: true, message: "Notification deleted" });
});

// ─────────────────────────────────────────────
// DELETE /api/notifications/read-all  (xoá tất cả đã đọc)
// ─────────────────────────────────────────────
const clearReadNotifications = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const result = await notifService.deleteReadAll(userId);
  return res.status(200).json({ success: true, ...result });
});

// ─────────────────────────────────────────────
// POST /api/notifications/admin/broadcast   (admin only)
// Body: { recipientIds?: [id,...], title, body?, link? }
// recipientIds rỗng hoặc không truyền => broadcast tất cả
// ─────────────────────────────────────────────
const adminBroadcast = asyncHandler(async (req, res) => {
  const { recipientIds = [], title, body = "", link = "" } = req.body;

  if (!title?.trim()) throw new AppError("title is required", 400);

  const io = req.app.get("io");
  const result = await notifService.adminBroadcast(io, {
    recipientIds,
    title: title.trim(),
    body,
    link,
  });

  return res.status(200).json({ success: true, ...result });
});

module.exports = {
  getMyNotifications,
  getUnreadCount,
  markOneRead,
  markAllRead,
  deleteNotification,
  clearReadNotifications,
  adminBroadcast,
};
