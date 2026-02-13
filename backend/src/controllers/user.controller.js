const asyncHandler = require("../utils/asyncHandler");
const UserService = require("../services/user.service");

/**
 * GET /api/user/me/profile
 * (Auth required)
 */
exports.getMyProfile = asyncHandler(async (req, res) => {
  const data = await UserService.getProfile({
    targetUserId: req.user.id,
    viewerUserId: req.user.id,
    query: req.query,
  });
  return res.status(200).json({ success: true, data });
});

/**
 * GET /api/user/:userId/profile
 * (Public)
 */
exports.getUserProfile = asyncHandler(async (req, res) => {
  const viewerId = req.user?.id; // nếu bạn muốn public hoàn toàn thì không cần auth middleware
  const data = await UserService.getProfile({
    targetUserId: req.params.userId,
    viewerUserId: viewerId,
    query: req.query,
  });
  return res.status(200).json({ success: true, data });
});

/**
 * PUT /api/user/me/profile
 * (Auth required)
 */
exports.updateMyProfile = asyncHandler(async (req, res) => {
    console.log("req.user =", req.user);
  const user = await UserService.updateMyProfile({
    userId: req.user.id,
    body: req.body,
  });
  return res.status(200).json({ success: true, message: "Profile updated", data: user });
});