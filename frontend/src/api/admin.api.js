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
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

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
export const getAllUsers = async () => {
  try {
    const res = await apiClient.get("/admin/users");
    // backend tùy bạn: có thể trả { users: [...] } hoặc [...] => FE tự handle
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: parseError(err) };
  }
};

// PATCH /api/admin/users/:userId/status
export const updateUserStatus = async (userId, status) => {
  try {
    const res = await apiClient.patch(`/admin/users/${userId}/status`, {
      status,
    });
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: parseError(err) };
  }
};

// DELETE /api/admin/users/:userId
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
