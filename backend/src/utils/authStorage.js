export function clearAuthStorage() {
  // xóa tất cả key có thể tồn tại trong project của bạn
  localStorage.removeItem("authToken");
  localStorage.removeItem("token");
  localStorage.removeItem("user");

  // nếu bạn có refresh token / role / v.v.
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("role");
}
