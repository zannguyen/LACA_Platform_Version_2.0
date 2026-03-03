const asyncHandler = require("../utils/asyncHandler");
const UserService = require("../services/user.service");
const notifService = require("../services/notification.service");

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
  return res
    .status(200)
    .json({ success: true, message: "Profile updated", data: user });
});

/**
 * PUT /api/user/me/password
 * (Auth required)
 */
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "Please provide all required fields",
    });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "New password and confirm password do not match",
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters",
    });
  }

  const result = await UserService.changePassword({
    userId: req.user.id,
    currentPassword,
    newPassword,
  });

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: result.message,
    });
  }

  return res.status(200).json({
    success: true,
    message: "Password changed successfully",
  });
});

/**
 * GET /api/user/me/account-settings
 * (Auth required)
 */
exports.getMyAccountSettings = asyncHandler(async (req, res) => {
  const data = await UserService.getMyAccountSettings(req.user.id);
  return res.status(200).json({ success: true, data });
});

/**
 * POST /api/user/me/account-settings/email-otp/send
 * (Auth required)
 */
exports.sendEmailChangeOtp = asyncHandler(async (req, res) => {
  const data = await UserService.sendEmailChangeOtp({
    userId: req.user.id,
    email: req.body?.email,
  });

  return res.status(200).json({
    success: true,
    message: "OTP đã được gửi tới email mới",
    data,
  });
});

/**
 * PUT /api/user/me/account-settings
 * (Auth required)
 */
exports.updateMyAccountSettings = asyncHandler(async (req, res) => {
  const data = await UserService.updateMyAccountSettings({
    userId: req.user.id,
    body: req.body,
  });
  return res
    .status(200)
    .json({ success: true, message: "Account settings updated", data });
});

/**
 * POST /api/user/me/delete-account/request
 * (Auth required)
 */
exports.requestDeleteAccount = asyncHandler(async (req, res) => {
  const data = await UserService.requestDeleteAccountOtp({
    userId: req.user.id,
  });

  return res.status(200).json({
    success: true,
    message: "Đã gửi mã xác nhận xóa tài khoản qua email",
    data,
  });
});

/**
 * POST /api/user/me/delete-account/confirm
 * (Auth required)
 */
exports.confirmDeleteAccount = asyncHandler(async (req, res) => {
  const data = await UserService.confirmDeleteAccount({
    userId: req.user.id,
    otpToken: req.body?.otpToken,
    otpCode: req.body?.otpCode,
  });

  return res.status(200).json({
    success: true,
    message: "Tài khoản đã được xóa",
    data,
  });
});

/**
 * GET /api/user/me/privacy-data
 * (Auth required)
 */
exports.getMyPrivacyData = asyncHandler(async (req, res) => {
  const data = await UserService.getMyPrivacyData(req.user.id);
  return res.status(200).json({ success: true, data });
});

/**
 * PUT /api/user/me/privacy-data
 * (Auth required)
 */
exports.updateMyPrivacyData = asyncHandler(async (req, res) => {
  const data = await UserService.updateMyPrivacyData({
    userId: req.user.id,
    body: req.body,
  });

  return res.status(200).json({
    success: true,
    message: "Privacy data updated",
    data,
  });
});

/**
 * GET /api/user/me/recent-activities
 * (Auth required)
 */
exports.getMyRecentActivities = asyncHandler(async (req, res) => {
  const data = await UserService.getMyRecentActivities({
    userId: req.user.id,
    query: req.query,
  });

  return res.status(200).json({ success: true, data });
});
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
  res
    .status(200)
    .json({ success: true, message: "User unblocked successfully" });
});

exports.getBlockedUsers = asyncHandler(async (req, res) => {
  const blockerId = req.user.id;
  const blockedUsers = await UserService.getBlockedUsers(blockerId);
  res.status(200).json({ success: true, data: blockedUsers });
});

// ===== Follow / Unfollow (Auth required) =====
exports.followUser = asyncHandler(async (req, res) => {
  const targetId = req.params.id;
  const me = req.user.id;

  const result = await UserService.followUser(me, targetId);
  const followers = await UserService.getFollowersCount(targetId);

  // Notify the target user
  try {
    const io = req.app.get("io");
    const followerUser = await require("../models/user.model")
      .findById(me)
      .select("fullname username");
    const followerName =
      followerUser?.fullname || followerUser?.username || "Ai đó";
    await notifService.createAndEmit(io, {
      recipientId: targetId,
      senderId: me,
      type: "new_follower",
      title: `${followerName} đã theo dõi bạn`,
      body: "",
      link: `/profile/${me}`,
      refId: me,
      refModel: "User",
    });
  } catch (notifErr) {
    console.error("[Notification] new_follower error:", notifErr.message);
  }

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

// ===== Preferred Tags (Sở thích) =====
exports.getMyPreferredTags = asyncHandler(async (req, res) => {
  const User = require("../models/user.model");
  const user = await User.findById(req.user.id).populate("preferredTags");
  res.status(200).json({ success: true, data: user.preferredTags || [] });
});

exports.updateMyPreferredTags = asyncHandler(async (req, res) => {
  const { tagIds } = req.body;
  const User = require("../models/user.model");

  if (!Array.isArray(tagIds)) {
    return res.status(400).json({ success: false, message: "tagIds phải là mảng" });
  }

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { preferredTags: tagIds },
    { new: true }
  ).populate("preferredTags");

  res.status(200).json({ success: true, message: "Cập nhật sở thích thành công", data: user.preferredTags });
});

// Get user's preferred tags (public)
exports.getUserPreferredTags = asyncHandler(async (req, res) => {
  const User = require("../models/user.model");
  const user = await User.findById(req.params.userId).populate("preferredTags");
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }
  res.status(200).json({ success: true, data: user.preferredTags || [] });
});
