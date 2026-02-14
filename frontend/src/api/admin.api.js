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
    const activities = res.data?.activities || [];
    return { success: true, data: activities };
  } catch (err) {
    return { success: false, error: parseError(err), data: [] };
  }
};

/* =======================
   USER MANAGEMENT
======================= */

const computeStatus = (u) => {
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
      status: u.status || computeStatus(u),
      role: u.role || "user",
      createdAt: u.createdAt,

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

// PATCH /api/admin/users/:userId/status
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

// PATCH /api/admin/users/:userId/suspend
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

// PATCH /api/admin/users/:userId/delete
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

export const getReportedContent = async ({
  status = "pending",
  page = 1,
  limit = 10,
} = {}) => {
  try {
    const res = await apiClient.get("/admin/reports", {
      params: { status, page, limit },
    });
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: parseError(err) };
  }
};

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

export const deleteContent = async (reportId) => {
  try {
    const res = await apiClient.delete(`/admin/reports/${reportId}`);
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: parseError(err) };
  }
};

/* =======================
   MAP MANAGEMENT (LOCATIONS = Place)
======================= */

const normalizePlace = (p) => {
  const id = p?.id || p?._id;

  const coords = p?.location?.coordinates;
  const lngRaw =
    p?.lng ?? p?.longitude ?? (Array.isArray(coords) ? coords[0] : undefined);
  const latRaw =
    p?.lat ?? p?.latitude ?? (Array.isArray(coords) ? coords[1] : undefined);

  const longitude = Number(lngRaw);
  const latitude = Number(latRaw);

  return {
    id,
    name: p?.name || "",
    address: p?.address || "",
    category: p?.category || "other",
    isActive: p?.isActive !== undefined ? !!p.isActive : true,
    longitude,
    latitude,
    raw: p,
  };
};

// GET /api/admin/locations?isActive=true|false
export const getAllLocations = async ({ isActive } = {}) => {
  try {
    const res = await apiClient.get("/admin/locations", {
      params: isActive === undefined ? {} : { isActive },
    });

    // backend: { success:true, data:{ locations, count } }
    const raw = res.data?.data?.locations || [];
    const locations = raw
      .map(normalizePlace)
      .filter(
        (x) => Number.isFinite(x.latitude) && Number.isFinite(x.longitude),
      );

    return {
      success: true,
      data: { locations, count: locations.length },
      raw: res.data,
    };
  } catch (err) {
    return {
      success: false,
      error: parseError(err),
      data: { locations: [], count: 0 },
    };
  }
};

// POST /api/admin/locations
export const createLocation = async (payload) => {
  try {
    // FE form thường dùng latitude/longitude
    const latitude = payload?.latitude ?? payload?.lat;
    const longitude = payload?.longitude ?? payload?.lng;

    const body = {
      name: payload?.name,
      address: payload?.address,
      category: payload?.category,
      googlePlaceId: payload?.googlePlaceId,
      isActive: payload?.isActive,
      lat: latitude !== undefined ? Number(latitude) : undefined,
      lng: longitude !== undefined ? Number(longitude) : undefined,
    };

    const res = await apiClient.post("/admin/locations", body);
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: parseError(err) };
  }
};

// PUT /api/admin/locations/:id
export const updateLocation = async (id, payload) => {
  try {
    const latitude = payload?.latitude ?? payload?.lat;
    const longitude = payload?.longitude ?? payload?.lng;

    const body = {
      ...payload,
      ...(latitude !== undefined ? { lat: Number(latitude) } : {}),
      ...(longitude !== undefined ? { lng: Number(longitude) } : {}),
    };

    // tránh gửi thừa
    delete body.latitude;
    delete body.longitude;

    const res = await apiClient.put(`/admin/locations/${id}`, body);
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: parseError(err) };
  }
};

// DELETE /api/admin/locations/:id
export const deleteLocation = async (id) => {
  try {
    const res = await apiClient.delete(`/admin/locations/${id}`);
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: parseError(err) };
  }
};

// PUT /api/admin/locations/:id/approve
export const approveLocation = async (id) => {
  try {
    const res = await apiClient.put(`/admin/locations/${id}/approve`);
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: parseError(err) };
  }
};

// PUT /api/admin/locations/:id/reject
export const rejectLocation = async (id) => {
  try {
    const res = await apiClient.put(`/admin/locations/${id}/reject`);
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: parseError(err) };
  }
};

/* =======================
   ANALYTICS
======================= */

// GET /api/admin/analytics?days=7|30
export const getAnalytics = async (days = 7) => {
  try {
    const res = await apiClient.get("/admin/analytics", { params: { days } });
    // backend: { success:true, data:{...} }
    return { success: true, data: res.data?.data ?? res.data };
  } catch (err) {
    return { success: false, error: parseError(err) };
  }
};

export default apiClient;
