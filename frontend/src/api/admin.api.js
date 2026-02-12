import axios from "axios";

/* =======================
   BASE CONFIG
======================= */
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:4000/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// Attach token
apiClient.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("authToken") || localStorage.getItem("token");

  console.log("[FE] token exists?", !!token); // ✅ debug FE

  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Helper: normalize error
const parseError = (err) => {
  const message =
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    "Request failed";
  const status = err?.response?.status;
  return { message, status, raw: err?.response?.data };
};

/* =======================
   DASHBOARD
======================= */

// GET /api/admin/dashboard
export const getDashboardStats = async () => {
  try {
    const res = await apiClient.get("/admin/dashboard");
    // backend trả { totalUsers, activeLocations, pendingReviews, totalPosts }
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: parseError(err) };
  }
};

// GET /api/admin/recent-activity?limit=5
export const getRecentActivity = async (limit = 5) => {
  try {
    const res = await apiClient.get("/admin/recent-activity", {
      params: { limit },
    });

    // backend trả: { activities: [...] }
    const activities = res.data?.activities || [];

    // ✅ trả đúng format mock UI đang dùng: data là mảng
    return { success: true, data: activities };
  } catch (err) {
    return { success: false, error: parseError(err), data: [] };
  }
};

/* =======================
   USER MANAGEMENT
======================= */

// GET /api/admin/users
/* =======================
   USER MANAGEMENT
======================= */

const computeStatus = (u) => {
  // ưu tiên giống backend
  if (u?.deletedAt) return "deleted";
  if (u?.suspendUntil && new Date(u.suspendUntil).getTime() > Date.now())
    return "suspended";
  if (u?.isActive === false) return "blocked";
  if (u?.isEmailVerified === false) return "unverified";
  return "active";
};

// GET /api/admin/users
export const getAllUsers = async ({
  query = "",
  status = "all",
  page = 1,
  limit = 10,
} = {}) => {
  try {
    const res = await apiClient.get("/admin/users", {
      params: { query, status, page, limit },
    });

    const payload = res.data || {};
    const rawUsers = Array.isArray(payload.users) ? payload.users : [];

    const users = rawUsers.map((u) => ({
      id: u.id || u._id,
      name: u.fullname || u.username || u.email || "Unknown",
      email: u.email || "",
      avatar: u.avatar || null,

      // ✅ 5 statuses
      status: u.status || computeStatus(u),

      role: u.role || "user",
      createdAt: u.createdAt,

      // keep raw fields for dialogs
      fullname: u.fullname,
      username: u.username,
      isActive: u.isActive,
      isEmailVerified: u.isEmailVerified,
      deletedAt: u.deletedAt || null,
      suspendUntil: u.suspendUntil || null,
    }));

    const total = payload.total ?? users.length;

    return {
      success: true,
      data: {
        users,
        total,
        page: payload.page ?? page,
        limit: payload.limit ?? limit,
      },
      users,
      total,
    };
  } catch (err) {
    return {
      success: false,
      error: parseError(err),
      data: { users: [], total: 0, page, limit },
      users: [],
      total: 0,
    };
  }
};

// PATCH /api/admin/users/:userId/status  (blocked/unblocked)
export const updateUserStatus = async (userId, isActive) => {
  try {
    const res = await apiClient.patch(`/admin/users/${userId}/status`, {
      isActive,
    });
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: parseError(err) };
  }
};

// ✅ PATCH /api/admin/users/:userId/suspend
// suspendUntil: ISO string | null
export const suspendUser = async (userId, suspendUntil) => {
  try {
    const res = await apiClient.patch(`/admin/users/${userId}/suspend`, {
      suspendUntil,
    });
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: parseError(err) };
  }
};

// ✅ PATCH /api/admin/users/:userId/delete
// deleted: true (soft delete) | false (restore)
export const softDeleteUser = async (userId, deleted) => {
  try {
    const res = await apiClient.patch(`/admin/users/${userId}/delete`, {
      deleted,
    });
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: parseError(err) };
  }
};

// DELETE /api/admin/users/:userId  (backend bạn đã đổi thành soft delete)
export const deleteUser = async (userId) => {
  try {
    const res = await apiClient.delete(`/admin/users/${userId}`);
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: parseError(err) };
  }
};

/* =======================
   CONTENT MODERATION (REPORTS)
======================= */

// GET /api/admin/reports?status=pending&page=1&limit=10
export const getReportedContent = async ({
  status = "pending",
  page = 1,
  limit = 10,
} = {}) => {
  try {
    const res = await apiClient.get("/admin/reports", {
      params: { status, page, limit },
    });
    // gợi ý backend: { reports: [...], total, page, limit }
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: parseError(err) };
  }
};

// PATCH /api/admin/reports/:reportId/approve  (ví dụ: dismiss/report->reviewed)
export const approveContent = async (reportId, payload = {}) => {
  try {
    const res = await apiClient.patch(
      `/admin/reports/${reportId}/approve`,
      payload,
    );
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: parseError(err) };
  }
};

// PATCH /api/admin/reports/:reportId/reject
export const rejectContent = async (reportId, payload = {}) => {
  try {
    const res = await apiClient.patch(
      `/admin/reports/${reportId}/reject`,
      payload,
    );
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: parseError(err) };
  }
};

// DELETE /api/admin/reports/:reportId  (hoặc xoá target tùy bạn)
export const deleteContent = async (reportId) => {
  try {
    const res = await apiClient.delete(`/admin/reports/${reportId}`);
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: parseError(err) };
  }
};

/* =======================
   MAP MANAGEMENT (PLACES)
======================= */

// GET /api/admin/places
export const getAllLocations = async () => {
  try {
    const res = await apiClient.get("/admin/places");
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: parseError(err) };
  }
};

// POST /api/admin/places
export const createLocation = async (payload) => {
  try {
    const res = await apiClient.post("/admin/places", payload);
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: parseError(err) };
  }
};

// PATCH /api/admin/places/:placeId
export const updateLocation = async (placeId, payload) => {
  try {
    const res = await apiClient.patch(`/admin/places/${placeId}`, payload);
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: parseError(err) };
  }
};

// DELETE /api/admin/places/:placeId
export const deleteLocation = async (placeId) => {
  try {
    const res = await apiClient.delete(`/admin/places/${placeId}`);
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: parseError(err) };
  }
};

/* =======================
   ANALYTICS
======================= */

// (Nếu backend bạn chưa làm analytics endpoint thì để sau)
// Gợi ý: GET /api/admin/analytics
export const getAnalytics = async () => {
  try {
    const res = await apiClient.get("/admin/analytics");
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: parseError(err) };
  }
};

export default apiClient;
