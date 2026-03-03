const mongoose = require("mongoose");
const Place = require("../models/place.model");
const Post = require("../models/post.model");
const User = require("../models/user.model");
const Follow = require("../models/follow.model");
const AppError = require("../utils/appError");

const normalizeObjectIds = (ids = []) =>
  ids
    .filter(Boolean)
    .map((id) =>
      id instanceof mongoose.Types.ObjectId
        ? id
        : new mongoose.Types.ObjectId(id),
    );

// Helper to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
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
  userPreferredTagIds = [],
  userInterestNames = [],
  useRecommendation = false,
  currentUserId = null,
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

    // Filter: only show posts that haven't expired
    {
      $match: {
        $or: [
          { expireAt: null },
          { expireAt: { $gt: new Date() } }
        ]
      }
    },

    ...(blockedIds.length > 0
      ? [{ $match: { userId: { $nin: blockedIds } } }]
      : []
    ),

    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },

    // ✅ Lookup tags to get full tag info (name, icon, color)
    {
      $lookup: {
        from: "tags",
        localField: "tags",
        foreignField: "_id",
        as: "tags",
      },
    },

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

        // ✅ Tags for post categorization
        tags: {
          _id: 1,
          name: 1,
          icon: 1,
          color: 1,
        },

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
          ...(blockedIds.length > 0
            ? { userId: { $in: followedIds, $nin: blockedIds } }
            : {}),
          // Filter: only show posts that haven't expired
          $or: [
            { expireAt: null },
            { expireAt: { $gt: new Date() } }
          ]
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
  // 3) Get current user's following for isFollowing flag
  // ===============================
  let currentUserFollowing = new Set();

  if (currentUserId) {
    const userIdObj = new mongoose.Types.ObjectId(currentUserId);

    // Get users that current user is following
    const followingRecords = await Follow.find({ followerUserId: userIdObj }).select("followingUserId").lean();
    followingRecords.forEach(record => {
      currentUserFollowing.add(String(record.followingUserId));
    });
  }

  // ===============================
  // 4) Merge + de-dupe + sort
  // ===============================
  const merged = [];
  const seen = new Set();

  // Helper to check if post tags match user's preferences
  const checkIsRecommended = (post) => {
    if (!useRecommendation || (!userPreferredTagIds.length && !userInterestNames.length)) {
      return false;
    }

    const postTagIds = post.tags ? post.tags.map((tag) => String(tag._id)) : [];
    const postTagNames = post.tags ? post.tags.map((tag) => (tag.name || "").toLowerCase()) : [];

    // Check for tag ID match
    const hasMatchingTagId = postTagIds.some((tagId) =>
      userPreferredTagIds.includes(tagId)
    );

    // Check for interest name match
    const hasMatchingInterest =
      userInterestNames.length > 0 &&
      userInterestNames.some((interestName) =>
        postTagNames.some((tagName) => tagName?.includes(interestName))
      );

    return hasMatchingTagId || hasMatchingInterest;
  };

  for (const p of [...nearbyPosts, ...followedPosts]) {
    const key = String(p._id);
    if (seen.has(key)) continue;
    seen.add(key);

    // Calculate distance for followed posts (posts from followed users that are outside 5km)
    let post = { ...p };

    // Use user._id from the populated user object
    const postUserIdStr = post.user?._id?.toString ? post.user._id.toString() : null;

    // Check if this post is from a mutual follow user
    const isMutualFollow = postUserIdStr && followedIds.length > 0 && followedIds.some(id => String(id) === postUserIdStr);

    // Add isMutualFollow flag to post level
    post.isMutualFollow = isMutualFollow;

    // For mutual follow posts, calculate distance if place has location
    if (isMutualFollow && post.place?.location?.lat && post.place?.location?.lng) {
      const placeLat = post.place.location.lat;
      const placeLng = post.place.location.lng;
      const distance = calculateDistance(lat, lng, placeLat, placeLng);
      post.distanceKm = Math.round(distance * 100) / 100;
    }

    // Add isFollowing flag for ALL posts
    const postUserId = post.userId?.toString?.() || post.user?._id?.toString?.();
    if (postUserId && post.user) {
      post.user = {
        ...post.user,
        isFollowing: currentUserFollowing.has(postUserId),
        isMutualFollow: isMutualFollow,
      };
    }

    // Add isRecommended flag
    const postWithRecommendation = {
      ...post,
      isRecommended: checkIsRecommended(p),
    };
    merged.push(postWithRecommendation);
  }

  if (useRecommendation && (userPreferredTagIds.length || userInterestNames.length)) {
    // Separate matching and non-matching posts
    const matchingPosts = [];
    const nonMatchingPosts = [];

    merged.forEach((post) => {
      if (post.isRecommended) {
        matchingPosts.push(post);
      } else {
        nonMatchingPosts.push(post);
      }
    });

    // Sort each group by newest first
    matchingPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    nonMatchingPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Combine: matching posts first, then non-matching
    const result = [...matchingPosts, ...nonMatchingPosts].slice(0, Math.max(limit, 10));

    if (!result.length) {
      throw new AppError("No posts found in this area", 404);
    }

    return result;
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
        maxDistance: 100,
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
    ...(blockedIds.length > 0
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
          avatar: "$user.avatar",
        },
      },
    },
  ];

  const posts = await Place.aggregate(pipeline);

  // Return empty array instead of throwing error when no posts found
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
          ...(blockedIds.length > 0
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
  mutualFollowUserIds = [],
}) => {
  const blockedIds = normalizeObjectIds(blockedUserIds);
  const mutualIds = normalizeObjectIds(mutualFollowUserIds);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const nearbyPipeline = [
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
          ...(blockedIds.length > 0
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

  const nearbyHotspots = await Place.aggregate(nearbyPipeline);

  let mutualFollowHotspots = [];
  if (mutualIds.length > 0) {
    const mutualPipeline = [
      {
        $match: {
          status: "active",
          createdAt: { $gte: since },
          userId: { $in: mutualIds },
          placeId: { $ne: null },
          ...(blockedIds.length > 0 ? { userId: { $in: mutualIds, $nin: blockedIds } } : {}),
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$placeId",
          weight: { $sum: 1 },
          thumb: { $first: { $arrayElemAt: ["$mediaUrl", 0] } },
        },
      },
      {
        $lookup: {
          from: "places",
          localField: "_id",
          foreignField: "_id",
          as: "place",
        },
      },
      { $unwind: "$place" },
      {
        $project: {
          _id: 0,
          placeId: "$_id",
          lng: { $arrayElemAt: ["$place.location.coordinates", 0] },
          lat: { $arrayElemAt: ["$place.location.coordinates", 1] },
          weight: 1,
          thumb: 1,
          distanceMeters: null,
        },
      },
      { $match: { lat: { $ne: null }, lng: { $ne: null } } },
      { $limit: Math.max(limit * 2, 120) },
    ];

    mutualFollowHotspots = await Post.aggregate(mutualPipeline);
  }

  const mergedByPlace = new Map();

  for (const hotspot of nearbyHotspots) {
    mergedByPlace.set(String(hotspot.placeId), { ...hotspot });
  }

  for (const hotspot of mutualFollowHotspots) {
    const key = String(hotspot.placeId);
    const existing = mergedByPlace.get(key);

    if (existing) {
      existing.weight = (existing.weight || 0) + (hotspot.weight || 0);
      if (!existing.thumb && hotspot.thumb) {
        existing.thumb = hotspot.thumb;
      }
    } else {
      mergedByPlace.set(key, { ...hotspot });
    }
  }

  return Array.from(mergedByPlace.values())
    .sort((a, b) => (b.weight || 0) - (a.weight || 0))
    .slice(0, limit);
};

// ===============================
// 5) Get all posts from mutual follow users (no radius limit)
// ===============================
exports.getPostsFromFollowedUsers = async ({
  limit = 50,
  blockedUserIds = [],
  mutualFollowUserIds = [],
}) => {
  const blockedIds = normalizeObjectIds(blockedUserIds);
  const mutualIds = normalizeObjectIds(mutualFollowUserIds);

  if (mutualIds.length === 0) {
    return [];
  }

  const pipeline = [
    {
      $match: {
        status: 'active',
        userId: { $in: mutualIds },
        ...(blockedIds.length > 0 ? { userId: { $nin: blockedIds } } : {}),
        // Filter: only show posts that haven't expired
        $or: [
          { expireAt: null },
          { expireAt: { $gt: new Date() } }
        ]
      },
    },
    {
      $lookup: {
        from: 'places',
        localField: 'placeId',
        foreignField: '_id',
        as: 'placeDoc',
      },
    },
    { $unwind: { path: '$placeDoc', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$user' },
    {
      $addFields: {
        place: {
          _id: '$placeDoc._id',
          name: '$placeDoc.name',
          address: '$placeDoc.address',
          location: {
            lng: { $arrayElemAt: ['$placeDoc.location.coordinates', 0] },
            lat: { $arrayElemAt: ['$placeDoc.location.coordinates', 1] },
          },
        },
      },
    },
    {
      $project: {
        _id: 1,
        content: 1,
        type: 1,
        mediaUrl: 1,
        createdAt: 1,
        placeId: 1,
        place: 1,
        user: {
          _id: '$user._id',
          fullname: '$user.fullname',
          username: '$user.username',
          avatar: '$user.avatar',
        },
      },
    },
    { $sort: { createdAt: -1 } },
    { $limit: limit },
  ];

  return Post.aggregate(pipeline);
};
