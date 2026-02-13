const MapService = require("../services/map.service");
const asyncHandler = require("../utils/asyncHandler");
const UserService = require("../services/user.service");

exports.getPostsInRadius = asyncHandler(async (req, res) => {
  const { lng, lat } = req.geo;
  let blockedUserIds = [];
  let followedUserIds = [];
  if (req.user?.id) {
    blockedUserIds = await UserService.getBlockedUserIds(req.user.id);
    followedUserIds = await UserService.getFollowingUserIds(req.user.id);
  }

  const posts = await MapService.getPostsInRadius({
    lng,
    lat,
    blockedUserIds,
    followedUserIds,
  });

  res.status(200).json({
    success: true,
    count: posts.length,
    data: posts,
  });
});

exports.getPostsAtPoint = asyncHandler(async (req, res) => {
  const { lng, lat } = req.geo;
  const { userLng, userLat } = req.query;
  let blockedUserIds = [];
  let followedUserIds = [];
  if (req.user?.id) {
    blockedUserIds = await UserService.getBlockedUserIds(req.user.id);
    followedUserIds = await UserService.getFollowingUserIds(req.user.id);
  }

  const posts = await MapService.getPostsAtPoint({
    lng,
    lat,
    userLng,
    userLat,
    blockedUserIds,
    followedUserIds,
  });

  res.status(200).json({
    success: true,
    count: posts.length,
    data: posts,
  });
});
