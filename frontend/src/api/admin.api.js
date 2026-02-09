import axios from "axios";

/* =======================
   BASE CONFIG
======================= */
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:4000/api"; 
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

// Attach token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const delay = (ms = 500) => new Promise((res) => setTimeout(res, ms));

/* =======================
   DASHBOARD
======================= */

export const getDashboardStats = async () => {
  try {
    const res = await apiClient.get("/admin/dashboard");
    return { success: true, data: res.data };
  } catch {
    await delay();
    return {
      success: true,
      data: {
        totalUsers: 1240,
        activeLocations: 340,
        pendingReviews: 12,
        totalPosts: 5320,
      },
    };
  }
};

export const getRecentActivity = async (limit = 5) => {
  await delay();
  return {
    success: true,
    data: [
      {
        id: 1,
        user: { name: "Nguyễn Văn A", avatar: null },
        action: "created a new check-in",
        location: "Central Park",
        timestamp: Date.now() - 5 * 60 * 1000,
      },
      {
        id: 2,
        user: { name: "Trần Thị B", avatar: null },
        action: "reviewed a location",
        location: "River Side",
        timestamp: Date.now() - 30 * 60 * 1000,
      },
    ].slice(0, limit),
  };
};

/* =======================
   USER MANAGEMENT
======================= */

export const getAllUsers = async () => {
  try {
    const res = await apiClient.get("/admin/users");
    return { success: true, data: res.data };
  } catch {
    await delay();
    return {
      success: true,
      data: {
        users: [
          {
            id: "u1",
            name: "Nguyễn Văn A",
            email: "a@test.com",
            status: "active",
            avatar: "",
          },
          {
            id: "u2",
            name: "Trần Thị B",
            email: "b@test.com",
            status: "inactive",
            avatar: "",
          },
          {
            id: "u3",
            name: "Lê Văn C",
            email: "c@test.com",
            status: "active",
            avatar: "",
          },
        ],
      },
    };
  }
};

export const updateUserStatus = async () => {
  await delay(300);
  return { success: true };
};

export const deleteUser = async () => {
  await delay(300);
  return { success: true };
};

/* =======================
   CONTENT MODERATION
======================= */

export const getReportedContent = async () => {
  return {
    success: true,
    data: {
      reports: [
        {
          id: "r1",
          reason: "SPAM",
          user: {
            name: "USER A",
            email: "usera@gmail.com",
            avatar: "",
          },
          post: {
            thumbnail: "https://picsum.photos/80/80?1",
          },
        },
        {
          id: "r2",
          reason: "HATE SPEECH",
          user: {
            name: "USER A",
            email: "usera@gmail.com",
            avatar: "",
          },
          post: {
            thumbnail: "https://picsum.photos/80/80?2",
          },
        },
      ],
    },
  };
};


export const approveContent = async () => {
  await delay(300);
  return { success: true };
};

export const rejectContent = async () => {
  await delay(300);
  return { success: true };
};

export const deleteContent = async () => {
  await delay(300);
  return { success: true };
};

/* =======================
   MAP MANAGEMENT
======================= */

export const getAllLocations = async () => {
  await delay();
  return {
    success: true,
    data: {
      locations: [
        {
          id: "m1",
          name: "Central Park",
          address: "Quận Hải Châu, Đà Nẵng",
          latitude: 16.05,
          longitude: 108.2,
          description: "",
        },
        {
          id: "m2",
          name: "River Side",
          address: "Quận Sơn Trà, Đà Nẵng",
          latitude: 16.06,
          longitude: 108.21,
          description: "",
        },
      ],
    },
  };
};

export const createLocation = async () => {
  await delay(300);
  return { success: true };
};

export const updateLocation = async () => {
  await delay(300);
  return { success: true };
};

export const deleteLocation = async () => {
  await delay(300);
  return { success: true };
};

/* =======================
   ANALYTICS (USER-BASED)
======================= */

export const getAnalytics = async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: {
          totalUsers: 12540,
          onlineUsers: 1340,
          newUsers: 320,

          userGrowth: [
            { label: "Mon", value: 120 },
            { label: "Tue", value: 180 },
            { label: "Wed", value: 200 },
            { label: "Thu", value: 200 },
            { label: "Fri", value: 200 },
            { label: "Sat", value: 150 },
            { label: "Sun", value: 90 },
          ],

          topRegions: [
            { name: "Ho Chi Minh City", count: 4200 },
            { name: "Ha Noi", count: 3100 },
            { name: "Da Nang", count: 1800 },
            { name: "Can Tho", count: 950 },
          ],
        },
      });
    }, 400);
  });
};



export default apiClient;
