/**
 * Socket.IO server URL — dùng cho chat realtime & online status.
 * Khi deploy: set VITE_SOCKET_URL hoặc tự động lấy từ VITE_API_URL (bỏ /api).
 * VD: VITE_API_URL=https://api.mysite.com/api → SOCKET_URL=https://api.mysite.com
 */
const apiUrl =
  import.meta.env.VITE_API_URL || "http://localhost:4000/api";
const explicitSocket =
  import.meta.env.VITE_SOCKET_URL || "";

export const SOCKET_URL = explicitSocket
  ? explicitSocket
  : apiUrl.replace(/\/api\/?$/, "") || "http://localhost:4000";
