import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:4000/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

// Interceptor tự động thêm token vào mọi request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ============================================
// CHECK-IN APIs
// ============================================

/**
 * Lấy danh sách check-in gần vị trí hiện tại
 * @param {number} latitude - Vĩ độ
 * @param {number} longitude - Kinh độ
 * @param {number} radius - Bán kính tìm kiếm (mét), mặc định 5000m = 5km
 */
export const getCheckInsNearby = async (latitude, longitude, radius = 5000) => {
  try {
    const res = await apiClient.get("/map/checkins/nearby", {
      params: { latitude, longitude, radius },
    });
    return {
      success: true,
      message: "Lấy danh sách check-in thành công",
      data: res.data,
    };
  } catch (err) {
    return {
      success: false,
      message:
        err.response?.data?.message || "Không thể lấy danh sách check-in",
      data: [],
    };
  }
};

/**
 * Lấy chi tiết một check-in (bao gồm tất cả ảnh và reactions)
 * @param {string} checkInId - ID của check-in
 */
export const getCheckInDetails = async (checkInId) => {
  try {
    const res = await apiClient.get(`/map/checkins/${checkInId}`);
    return {
      success: true,
      message: "Lấy chi tiết check-in thành công",
      data: res.data,
    };
  } catch (err) {
    return {
      success: false,
      message: err.response?.data?.message || "Không thể lấy chi tiết check-in",
      data: null,
    };
  }
};

/**
 * Tạo check-in mới
 * @param {Object} checkInData - Dữ liệu check-in
 * @param {string} checkInData.locationName - Tên địa điểm
 * @param {number} checkInData.latitude - Vĩ độ
 * @param {number} checkInData.longitude - Kinh độ
 * @param {string} checkInData.description - Mô tả (optional)
 * @param {Array<File>} photos - Mảng các file ảnh
 */
export const createCheckIn = async (checkInData, photos = []) => {
  try {
    const formData = new FormData();

    // Thêm data check-in
    formData.append("locationName", checkInData.locationName);
    formData.append("latitude", checkInData.latitude);
    formData.append("longitude", checkInData.longitude);
    if (checkInData.description) {
      formData.append("description", checkInData.description);
    }

    // Thêm photos
    photos.forEach((photo, index) => {
      formData.append("photos", photo);
    });

    const res = await apiClient.post("/map/checkins", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return {
      success: true,
      message: "Tạo check-in thành công",
      data: res.data,
    };
  } catch (err) {
    return {
      success: false,
      message: err.response?.data?.message || "Không thể tạo check-in",
      data: null,
    };
  }
};

/**
 * Xóa check-in của mình
 * @param {string} checkInId - ID của check-in
 */
export const deleteCheckIn = async (checkInId) => {
  try {
    const res = await apiClient.delete(`/map/checkins/${checkInId}`);
    return {
      success: true,
      message: "Xóa check-in thành công",
      data: res.data,
    };
  } catch (err) {
    return {
      success: false,
      message: err.response?.data?.message || "Không thể xóa check-in",
    };
  }
};

// ============================================
// REACTION APIs
// ============================================

/**
 * Thêm reaction vào một ảnh
 * @param {string} photoId - ID của ảnh
 * @param {string} reactionType - Loại reaction: 'love', 'fire', 'laugh', 'wow'
 */
export const addReaction = async (photoId, reactionType) => {
  try {
    const res = await apiClient.post("/map/reactions", {
      photoId,
      reactionType,
    });
    return {
      success: true,
      message: "Đã thả cảm xúc",
      data: res.data,
    };
  } catch (err) {
    return {
      success: false,
      message: err.response?.data?.message || "Không thể thả cảm xúc",
      data: null,
    };
  }
};

/**
 * Xóa reaction khỏi ảnh
 * @param {string} photoId - ID của ảnh
 * @param {string} reactionType - Loại reaction cần xóa
 */
export const removeReaction = async (photoId, reactionType) => {
  try {
    const res = await apiClient.delete("/map/reactions", {
      data: { photoId, reactionType },
    });
    return {
      success: true,
      message: "Đã bỏ cảm xúc",
      data: res.data,
    };
  } catch (err) {
    return {
      success: false,
      message: err.response?.data?.message || "Không thể bỏ cảm xúc",
      data: null,
    };
  }
};

/**
 * Lấy danh sách người đã react vào ảnh
 * @param {string} photoId - ID của ảnh
 */
export const getPhotoReactions = async (photoId) => {
  try {
    const res = await apiClient.get(`/map/reactions/${photoId}`);
    return {
      success: true,
      message: "Lấy danh sách reactions thành công",
      data: res.data,
    };
  } catch (err) {
    return {
      success: false,
      message: err.response?.data?.message || "Không thể lấy reactions",
      data: [],
    };
  }
};

// ============================================
// LOCATION APIs
// ============================================

/**
 * Cập nhật vị trí real-time của user (nếu cần cho tính năng "nearby friends")
 * @param {number} latitude - Vĩ độ hiện tại
 * @param {number} longitude - Kinh độ hiện tại
 */
export const updateUserLocation = async (latitude, longitude) => {
  try {
    const res = await apiClient.put("/map/location", {
      latitude,
      longitude,
    });
    return {
      success: true,
      message: "Cập nhật vị trí thành công",
      data: res.data,
    };
  } catch (err) {
    return {
      success: false,
      message: err.response?.data?.message || "Không thể cập nhật vị trí",
      data: null,
    };
  }
};

/**
 * Tìm kiếm địa điểm theo tên
 * @param {string} query - Từ khóa tìm kiếm
 * @param {number} latitude - Vĩ độ hiện tại (để sắp xếp theo khoảng cách)
 * @param {number} longitude - Kinh độ hiện tại
 */
export const searchLocations = async (query, latitude, longitude) => {
  try {
    const res = await apiClient.get("/map/locations/search", {
      params: { query, latitude, longitude },
    });
    return {
      success: true,
      message: "Tìm kiếm thành công",
      data: res.data,
    };
  } catch (err) {
    return {
      success: false,
      message: err.response?.data?.message || "Tìm kiếm thất bại",
      data: [],
    };
  }
};

// ============================================
// USER CHECK-INS APIs
// ============================================

/**
 * Lấy tất cả check-in của một user
 * @param {string} userId - ID của user (nếu không truyền sẽ lấy của chính mình)
 */
export const getUserCheckIns = async (userId = null) => {
  try {
    const endpoint = userId
      ? `/map/users/${userId}/checkins`
      : "/map/users/me/checkins";

    const res = await apiClient.get(endpoint);
    return {
      success: true,
      message: "Lấy danh sách check-in thành công",
      data: res.data,
    };
  } catch (err) {
    return {
      success: false,
      message: err.response?.data?.message || "Không thể lấy check-in của user",
      data: [],
    };
  }
};

// ============================================
// POST APIs
// ============================================

/**
 * Lấy bài viết tại một điểm cụ thể trên bản đồ
 * @param {number} latitude - Vĩ độ của điểm click
 * @param {number} longitude - Kinh độ của điểm click
 * @param {number} userLatitude - Vĩ độ hiện tại của user
 * @param {number} userLongitude - Kinh độ hiện tại của user
 */
export const getPostsAtPoint = async (
  latitude,
  longitude,
  userLatitude,
  userLongitude,
) => {
  try {
    const res = await apiClient.get("/map/posts/at-point", {
      params: {
        lat: latitude, // Điểm click - backend expect 'lat'
        lng: longitude, // Điểm click - backend expect 'lng'
        userLat: userLatitude,
        userLng: userLongitude,
      },
    });
    return {
      success: true,
      message: "Lấy bài viết thành công",
      data: res.data,
    };
  } catch (err) {
    return {
      success: false,
      message:
        err.response?.data?.message || "Không thể lấy bài viết tại vị trí này",
      data: null,
    };
  }
};

export const getPostDensity = async (latitude, longitude, radiusKm = 5) => {
  try {
    const res = await apiClient.get("/map/posts/density", {
      params: {
        lat: latitude,
        lng: longitude,
        radius: radiusKm, // km
      },
    });

    return {
      success: true,
      message: "Lấy density thành công",
      data: res.data, // { success, count, data:[{lat,lng,weight}] }
    };
  } catch (err) {
    return {
      success: false,
      message: err.response?.data?.message || "Không thể lấy density",
      data: null,
    };
  }
};
export const getPostHotspots = async (
  latitude,
  longitude,
  radiusKm = 5,
  days = 30,
  limit = 80,
) => {
  try {
    const res = await apiClient.get("/map/posts/hotspots", {
      params: { lat: latitude, lng: longitude, radius: radiusKm, days, limit },
    });

    return {
      success: true,
      message: "Lấy hotspots thành công",
      data: res.data, // { success, count, data:[...] }
    };
  } catch (err) {
    return {
      success: false,
      message: err.response?.data?.message || "Không thể lấy hotspots",
      data: null,
    };
  }
};

export default apiClient;
