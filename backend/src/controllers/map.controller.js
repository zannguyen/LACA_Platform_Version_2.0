const MapService = require("../services/map.service");
const asyncHandler = require("../utils/asyncHandler");

exports.getPostsInRadius = asyncHandler(async (req, res) => {
  const { lng, lat } = req.geo;

  const posts = await MapService.getPostsInRadius({
    lng,
    lat,
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

  const posts = await MapService.getPostsAtPoint({
    lng,
    lat,
    userLng,
    userLat,
  });

  res.status(200).json({
    success: true,
    count: posts.length,
    data: posts,
  });
});
