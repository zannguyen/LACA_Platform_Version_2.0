const MapService = require("../services/map.service");
const asyncHandler = require("../utils/asyncHandler");
const UserService = require("../services/user.service");

// GET /map/posts/nearby?limit=10
exports.getPostsInRadius = asyncHandler(async (req, res) => {
  const { lng, lat } = req.geo;
  const limit = Number(req.query.limit || 10);

  let blockedUserIds = [];
  let followedUserIds = [];

  if (req.user?.id) {
    blockedUserIds = await UserService.getBlockedUserIds(req.user.id);
    // Chỉ mutual follow mới xem bài + vị trí ngoài 5km
    followedUserIds = await UserService.getMutualFollowUserIds(req.user.id);
  }

  const posts = await MapService.getPostsInRadius({
    lat, // ✅ đúng thứ tự
    lng,
    limit,
    blockedUserIds,
    followedUserIds,
  });

  res.status(200).json({
    success: true,
    count: posts.length,
    data: posts,
  });
});

// GET /map/posts/density?lat=..&lng=..&radius=5&days=30&limit=500
exports.getPostDensity = asyncHandler(async (req, res) => {
  const { lng, lat, radiusMeters } = req.geo;
  const days = Number(req.query.days || 30);
  const limit = Number(req.query.limit || 500);

  let blockedUserIds = [];
  if (req.user?.id) {
    blockedUserIds = await UserService.getBlockedUserIds(req.user.id);
  }

  const points = await MapService.getPostDensity({
    lat, // ✅ đúng
    lng,
    radiusMeters,
    days,
    limit,
    blockedUserIds,
  });

  res.status(200).json({
    success: true,
    count: points.length,
    data: points,
  });
});

// GET /map/posts/hotspots?lat=..&lng=..&radius=5&days=30&limit=80
exports.getPostHotspots = asyncHandler(async (req, res) => {
  const { lng, lat, radiusMeters } = req.geo;

  const days = Number(req.query.days || 30);
  const limit = Number(req.query.limit || 80);

  let blockedUserIds = [];
  if (req.user?.id) {
    blockedUserIds = await UserService.getBlockedUserIds(req.user.id);
  }

  const data = await MapService.getPostHotspots({
    lat, // ✅ đúng
    lng,
    radiusMeters,
    days,
    limit,
    blockedUserIds,
  });

  res.status(200).json({
    success: true,
    count: data.length,
    data,
  });
});

// GET /map/posts/at-point?lat=..&lng=..&userLat=..&userLng=..
exports.getPostsAtPoint = asyncHandler(async (req, res) => {
  const { lng, lat } = req.geo;

  const userLat = req.query.userLat != null ? Number(req.query.userLat) : null;
  const userLng = req.query.userLng != null ? Number(req.query.userLng) : null;

  let blockedUserIds = [];
  let followedUserIds = [];

  if (req.user?.id) {
    blockedUserIds = await UserService.getBlockedUserIds(req.user.id);
    // Chỉ mutual follow mới xem bài + vị trí ngoài 5km
    followedUserIds = await UserService.getMutualFollowUserIds(req.user.id);
  }

  const posts = await MapService.getPostsAtPoint({
    lat, // ✅ đúng
    lng,
    userLat,
    userLng,
    blockedUserIds,
    followedUserIds,
  });

  res.status(200).json({
    success: true,
    count: posts.length,
    data: posts,
  });
});
