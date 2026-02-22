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

// ===============================
// 1) FEED: nearby + followed
// ===============================
exports.getPostsInRadius = async ({
  lat,
  lng,
  limit = 10,
  radiusMeters = 5000,
  blockedUserIds = [],
  followedUserIds = [],
}) => {
  const blockedIds = normalizeObjectIds(blockedUserIds);
  const followedIds = normalizeObjectIds(followedUserIds);

  // ===============================
  // 1) Nearby posts (within radiusMeters)
  // ===============================
  const nearbyPipeline = [
    {
      $geoNear: {
        near: { type: "Point", coordinates: [lng, lat] },
        distanceField: "distanceMeters",
        maxDistance: radiusMeters,
        spherical: true,
      },
    },
    { $limit: 40 },
    {
      $lookup: {
        from: "posts",
        localField: "_id",
        foreignField: "placeId",
        as: "posts",
      },
    },
    { $unwind: "$posts" },

    // ✅ NEW: attach place info into each post BEFORE replaceRoot
    {
      $addFields: {
        "posts.distanceKm": {
          $round: [{ $divide: ["$distanceMeters", 1000] }, 2],
        },

        // place info (lat/lng/name/address) for Home icon + map focus
        "posts.place": {
          _id: "$_id",
          name: "$name",
          address: "$address",
          location: {
            lng: { $arrayElemAt: ["$location.coordinates", 0] },
            lat: { $arrayElemAt: ["$location.coordinates", 1] },
          },
        },

        // keep placeId explicitly
        "posts.placeId": "$_id",
      },
    },

    { $replaceRoot: { newRoot: "$posts" } },
    { $match: { status: "active" } },

    ...(blockedIds.length
      ? [{ $match: { userId: { $nin: blockedIds } } }]
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

        // ✅ NEW: must return for Home to show icon
        placeId: 1,
        place: 1,

        user: {
          _id: "$user._id",
          fullname: "$user.fullname",
          username: "$user.username",
          avatar: "$user.avatar",
        },
      },
    },

    { $sort: { createdAt: -1, distanceKm: 1 } },
    { $limit: Math.max(limit, 10) },
  ];

  const nearbyPosts = await Place.aggregate(nearbyPipeline);

  // ===============================
  // 2) Mutual-follow posts (ANY distance) — chỉ khi 2 người follow nhau
  // ===============================
  let followedPosts = [];
  if (followedIds.length) {
    const followedPipeline = [
      {
        $match: {
          status: "active",
          userId: { $in: followedIds },
          ...(blockedIds.length
            ? { userId: { $in: followedIds, $nin: blockedIds } }
            : {}),
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

      // ✅ Optional (khuyến nghị): populate place cho followed posts để vẫn có icon vị trí
      // Nếu bạn muốn followed posts cũng có icon, bật đoạn lookup Place này.
      {
        $lookup: {
          from: "places",
          localField: "placeId",
          foreignField: "_id",
          as: "placeDoc",
        },
      },
      { $unwind: { path: "$placeDoc", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          place: {
            _id: "$placeDoc._id",
            name: "$placeDoc.name",
            address: "$placeDoc.address",
            location: {
              lng: { $arrayElemAt: ["$placeDoc.location.coordinates", 0] },
              lat: { $arrayElemAt: ["$placeDoc.location.coordinates", 1] },
            },
          },
        },
      },

      {
        $project: {
          content: 1,
          type: 1,
          mediaUrl: 1,
          createdAt: 1,
          distanceKm: { $literal: null },

          // ✅ NEW
          placeId: 1,
          place: 1,

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

    const da = a.distanceKm == null ? 999999 : a.distanceKm;
    const db = b.distanceKm == null ? 999999 : b.distanceKm;
    return da - db;
  });

  const result = merged.slice(0, Math.max(limit, 10));

  if (!result.length) {
    throw new AppError("No posts found in this area", 404);
  }

  return result;
};

// ===============================
// 2) Click at a point -> posts
// ===============================
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

  if (userLat && userLng) {
    const distance = calculateDistance(userLat, userLng, lat, lng);

    if (distance > 5) {
      remoteOnlyFollowed = true;

      if (!followedIds.length) {
        throw new AppError(
          "Bạn không thể xem bài viết ở vị trí này. Chỉ xem được ngoài 5km khi hai người đã follow nhau. Vui lòng di chuyển đến gần hơn.",
          403,
        );
      }
    }
  }

  const pipeline = [
    {
      $geoNear: {
        near: { type: "Point", coordinates: [lng, lat] },
        distanceField: "distanceMeters",
        maxDistance: 30,
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
          $round: [{ $divide: ["$distanceMeters", 1000] }, 2],
        },

        // ✅ attach place info into each post before replaceRoot
        "posts.place": {
          _id: "$_id",
          name: "$name",
          address: "$address",
          location: {
            lng: { $arrayElemAt: ["$location.coordinates", 0] },
            lat: { $arrayElemAt: ["$location.coordinates", 1] },
          },
        },

        // keep placeId explicitly
        "posts.placeId": "$_id",
      },
    },
    { $replaceRoot: { newRoot: "$posts" } },

    { $match: { status: "active" } },

    ...(remoteOnlyFollowed
      ? [{ $match: { userId: { $in: followedIds } } }]
      : []),
    ...(blockedIds.length
      ? [{ $match: { userId: { $nin: blockedIds } } }]
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
        placeId: 1,
        place: 1,
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

// ===============================
// 3) Density (for heat/hotspot)
// ===============================
exports.getPostDensity = async ({
  lat,
  lng,
  radiusMeters,
  days = 30,
  limit = 500,
  blockedUserIds = [],
}) => {
  const blockedIds = normalizeObjectIds(blockedUserIds);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const pipeline = [
    {
      $geoNear: {
        near: { type: "Point", coordinates: [lng, lat] },
        distanceField: "distanceMeters",
        maxDistance: radiusMeters,
        spherical: true,
        query: { isActive: true },
      },
    },
    { $limit: 1500 },
    {
      $lookup: {
        from: "posts",
        let: { pid: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$placeId", "$$pid"] } } },
          { $match: { status: "active", createdAt: { $gte: since } } },
          ...(blockedIds.length
            ? [{ $match: { userId: { $nin: blockedIds } } }]
            : []),
          { $project: { _id: 1 } },
        ],
        as: "posts",
      },
    },
    { $addFields: { weight: { $size: "$posts" } } },
    { $match: { weight: { $gt: 0 } } },
    {
      $project: {
        _id: 0,
        placeId: "$_id",
        lng: { $arrayElemAt: ["$location.coordinates", 0] },
        lat: { $arrayElemAt: ["$location.coordinates", 1] },
        weight: 1,
      },
    },
    { $sort: { weight: -1 } },
    { $limit: limit },
  ];

  return Place.aggregate(pipeline);
};

// ===============================
// 4) ✅ Hotspots with thumbnail
// ===============================
exports.getPostHotspots = async ({
  lat,
  lng,
  radiusMeters,
  days = 30,
  limit = 80,
  blockedUserIds = [],
}) => {
  const blockedIds = normalizeObjectIds(blockedUserIds);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const pipeline = [
    {
      $geoNear: {
        near: { type: "Point", coordinates: [lng, lat] },
        distanceField: "distanceMeters",
        maxDistance: radiusMeters,
        spherical: true,
        query: { isActive: true },
      },
    },

    { $limit: 1200 },

    {
      $lookup: {
        from: "posts",
        let: { pid: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$placeId", "$$pid"] } } },
          { $match: { status: "active", createdAt: { $gte: since } } },
          ...(blockedIds.length
            ? [{ $match: { userId: { $nin: blockedIds } } }]
            : []),

          { $sort: { createdAt: -1 } },
          { $project: { _id: 1, mediaUrl: 1, createdAt: 1 } },
        ],
        as: "posts",
      },
    },

    { $addFields: { weight: { $size: "$posts" } } },
    { $match: { weight: { $gt: 0 } } },

    {
      $addFields: {
        thumb: {
          $let: {
            vars: { first: { $arrayElemAt: ["$posts", 0] } },
            in: { $arrayElemAt: ["$$first.mediaUrl", 0] },
          },
        },
      },
    },

    {
      $project: {
        _id: 0,
        placeId: "$_id",
        lng: { $arrayElemAt: ["$location.coordinates", 0] },
        lat: { $arrayElemAt: ["$location.coordinates", 1] },
        weight: 1,
        thumb: 1,
        distanceMeters: 1,
      },
    },

    { $sort: { weight: -1 } },
    { $limit: limit },
  ];

  return Place.aggregate(pipeline);
};

// ===============================
// Helpers
// ===============================
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = deg2rad(Number(lat2) - Number(lat1));
  const dLon = deg2rad(Number(lon2) - Number(lon1));
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(Number(lat1))) *
      Math.cos(deg2rad(Number(lat2))) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}
