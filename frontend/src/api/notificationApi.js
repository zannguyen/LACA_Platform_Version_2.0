import { api } from "./client";

/**
 * Lấy danh sách thông báo của người dùng (phân trang)
 * GET /api/notifications?page=1&limit=20
 */
export const getMyNotifications = async (page = 1, limit = 20) => {
  const res = await api.get(`/notifications`, {
    params: { page, limit },
  });
  return res.data;
};

/**
 * Lấy số lượng thông báo chưa đọc
 * GET /api/notifications/unread-count
 */
export const getUnreadCount = async () => {
  const res = await api.get(`/notifications/unread-count`);
  return res.data;
};

/**
 * Đánh dấu một thông báo là đã đọc
 * PATCH /api/notifications/:id/read
 */
export const markOneRead = async (notificationId) => {
  const res = await api.patch(`/notifications/${notificationId}/read`);
  return res.data;
};

/**
 * Đánh dấu TẤT CẢ thông báo là đã đọc
 * PATCH /api/notifications/read-all
 */
export const markAllRead = async () => {
  const res = await api.patch(`/notifications/read-all`);
  return res.data;
};

/**
 * Xóa một thông báo
 * DELETE /api/notifications/:id
 */
export const deleteNotification = async (notificationId) => {
  const res = await api.delete(`/notifications/${notificationId}`);
  return res.data;
};

/**
 * Xóa tất cả thông báo đã đọc
 * DELETE /api/notifications/read-all
 */
export const clearReadNotifications = async () => {
  const res = await api.delete(`/notifications/read-all`);
  return res.data;
};
