const mongoose = require("mongoose");
const Place = require("../models/place.model");
const Post = require("../models/post.model");
const AppError = require("../utils/appError");

const normalizeObjectIds = (ids = []) =>
  ids
    .filter(Boolean)
    .map((id) =>
      id instanceof mongoose.Types.ObjectId
        ? id
        : new mongoose.Types.ObjectId(id),
    );

exports.getPostsInRadius = async ({
  lat,
  lng,
  limit = 10,
  blockedUserIds = [],
  followedUserIds = [],
}) => {
  const blockedIds = normalizeObjectIds(blockedUserIds);
  const followedIds = normalizeObjectIds(followedUserIds);

  // ===============================
  // 1) Nearby posts (within 5km)
  // ===============================
  const nearbyPipeline = [
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [lng, lat],
        },
        distanceField: "distanceMeters",
        maxDistance: 5000,
        spherical: true,
      },
    },
    { $limit: 20 },
    {
      $lookup: {
        from: "posts",
        localField: "_id",
        foreignField: "placeId",
        as: "posts",
      },
    },
    { $unwind: "$posts" },
    {
      $addFields: {
        "posts.distanceKm": {
          $round: [{ $divide: ["$distanceMeters", 1000] }, 2],
        },
      },
    },
    { $replaceRoot: { newRoot: "$posts" } },
    {
      $match: {
        status: "active",
      },
    },
    ...(blockedIds.length
      ? [
          {
            $match: {
              userId: { $nin: blockedIds },
            },
          },
        ]
      : []),
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
    {
      $project: {
        content: 1,
        type: 1,
        mediaUrl: 1,
        distanceKm: 1,
        createdAt: 1,
        user: {
          _id: "$user._id",
          fullname: "$user.fullname",
          username: "$user.username",
          avatar: "$user.avatar",
        },
      },
    },
    {
      $sort: {
        createdAt: -1,
        distanceKm: 1,
      },
    },
    { $limit: Math.max(limit, 10) },
  ];

  const nearbyPosts = await Place.aggregate(nearbyPipeline);

  // ===============================
  // 2) Followed posts (ANY distance)
  // ===============================
  let followedPosts = [];
  if (followedIds.length) {
    const followedPipeline = [
      {
        $match: {
          status: "active",
          userId: { $in: followedIds },
          ...(blockedIds.length ? { userId: { $in: followedIds, $nin: blockedIds } } : {}),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          content: 1,
          type: 1,
          mediaUrl: 1,
          createdAt: 1,
          // Followed posts can be far away -> no distance
          distanceKm: { $literal: null },
          user: {
            _id: "$user._id",
            fullname: "$user.fullname",
            username: "$user.username",
            avatar: "$user.avatar",
          },
        },
      },
      { $sort: { createdAt: -1 } },
      { $limit: Math.max(limit * 3, 30) },
    ];

    followedPosts = await Post.aggregate(followedPipeline);
  }

  // ===============================
  // 3) Merge + de-dupe + sort
  // ===============================
  const merged = [];
  const seen = new Set();

  for (const p of [...nearbyPosts, ...followedPosts]) {
    const key = String(p._id);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(p);
  }

  merged.sort((a, b) => {
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    if (tb !== ta) return tb - ta;

    const da = a.distanceKm === null || a.distanceKm === undefined ? 999999 : a.distanceKm;
    const db = b.distanceKm === null || b.distanceKm === undefined ? 999999 : b.distanceKm;
    return da - db;
  });

  const result = merged.slice(0, Math.max(limit, 10));

  if (!result.length) {
    throw new AppError("No posts found in this area", 404);
  }

  return result;
};

exports.getPostsAtPoint = async ({
  lat,
  lng,
  userLat,
  userLng,
  blockedUserIds = [],
  followedUserIds = [],
}) => {
  const blockedIds = normalizeObjectIds(blockedUserIds);
  const followedIds = normalizeObjectIds(followedUserIds);

  let remoteOnlyFollowed = false;

  // Kiểm tra nếu có vị trí user, validate khoảng cách
  if (userLat && userLng) {
    const distance = calculateDistance(userLat, userLng, lat, lng);

    // Nếu click ngoài 5km, chỉ cho phép xem post của người mình follow
    if (distance > 5) {
      remoteOnlyFollowed = true;

      if (!followedIds.length) {
        throw new AppError(
          "Bạn không thể xem bài viết ở vị trí này. Vui lòng di chuyển đến gần hơn (trong bán kính 5km)",
          403,
        );
      }
    }
  }

  const pipeline = [
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [lng, lat],
        },
        distanceField: "distanceMeters",
        maxDistance: 30, // 30 meters
        spherical: true,
        query: { isActive: true },
      },
    },
    { $limit: 20 },
    {
      $lookup: {
        from: "posts",
        localField: "_id",
        foreignField: "placeId",
        as: "posts",
      },
    },
    { $unwind: "$posts" },
    {
      $addFields: {
        "posts.distanceKm": {
          $round: [{ $divide: ["$distanceMeters", 1000] }, 3],
        },
      },
    },
    { $replaceRoot: { newRoot: "$posts" } },

    // Only active posts
    { $match: { status: "active" } },

    ...(remoteOnlyFollowed
      ? [
          {
            $match: {
              userId: { $in: followedIds },
            },
          },
        ]
      : []),

    ...(blockedIds.length
      ? [
          {
            $match: {
              userId: { $nin: blockedIds },
            },
          },
        ]
      : []),

    { $sort: { createdAt: -1 } },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
    {
      $project: {
        content: 1,
        type: 1,
        mediaUrl: 1,
        distanceKm: 1,
        createdAt: 1,
        user: {
          _id: "$user._id",
          fullname: "$user.fullname",
          username: "$user.username",
        },
      },
    },
  ];

  const posts = await Place.aggregate(pipeline);

  if (!posts.length) {
    throw new AppError("No posts found at this location", 404);
  }

  return posts;
};

// Helper function to calculate distance using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(Number(lat2) - Number(lat1));
  const dLon = deg2rad(Number(lon2) - Number(lon1));
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(Number(lat1))) *
      Math.cos(deg2rad(Number(lat2))) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return distance;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}
