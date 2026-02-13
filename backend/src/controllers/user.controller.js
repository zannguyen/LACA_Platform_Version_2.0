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
  const viewerId = req.user?.id; // public: có thể không có auth
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
  const user = await UserService.updateMyProfile({
    userId: req.user.id,
    body: req.body,
  });
  return res.status(200).json({ success: true, message: "Profile updated", data: user });
});

// ===== Block / Unblock (Auth required) =====
exports.blockUser = asyncHandler(async (req, res) => {
  const blockedId = req.params.id;
  const blockerId = req.user.id;
  await UserService.blockUser(blockerId, blockedId);
  res.status(200).json({ success: true, message: "User blocked successfully" });
});

exports.unblockUser = asyncHandler(async (req, res) => {
  const blockedId = req.params.id;
  const blockerId = req.user.id;
  await UserService.unblockUser(blockerId, blockedId);
  res.status(200).json({ success: true, message: "User unblocked successfully" });
});

// ===== Follow / Unfollow (Auth required) =====
exports.followUser = asyncHandler(async (req, res) => {
  const targetId = req.params.id;
  const me = req.user.id;

  const result = await UserService.followUser(me, targetId);
  const followers = await UserService.getFollowersCount(targetId);

  res.status(200).json({
    success: true,
    message: "Followed",
    data: { ...result, followers },
  });
});

exports.unfollowUser = asyncHandler(async (req, res) => {
  const targetId = req.params.id;
  const me = req.user.id;

  const result = await UserService.unfollowUser(me, targetId);
  const followers = await UserService.getFollowersCount(targetId);

  res.status(200).json({
    success: true,
    message: "Unfollowed",
    data: { ...result, followers },
  });
});

exports.getFollowStatus = asyncHandler(async (req, res) => {
  const targetId = req.params.id;
  const me = req.user.id;
  const isFollowing = await UserService.isFollowingUser(me, targetId);
  res.status(200).json({ success: true, data: { isFollowing } });
});
