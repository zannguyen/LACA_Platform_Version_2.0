const Place = require("../models/place.model");
const AppError = require("../utils/appError");

exports.getPostsInRadius = async ({ lat, lng, limit = 10 }) => {
  const pipeline = [
    // 1️⃣ Tìm place gần user
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

    // 2️⃣ Giới hạn place
    { $limit: 20 },

    // 3️⃣ Join posts theo placeId
    {
      $lookup: {
        from: "posts",
        localField: "_id",
        foreignField: "placeId",
        as: "posts",
      },
    },

    // 4️⃣ Mỗi document = 1 post
    { $unwind: "$posts" },

    // 5️⃣ Gắn distance vào post
    {
      $addFields: {
        "posts.distanceKm": {
          $round: [{ $divide: ["$distanceMeters", 1000] }, 2],
        },
      },
    },

    // 6️⃣ Lấy post làm root
    { $replaceRoot: { newRoot: "$posts" } },

    // 7️⃣ Chỉ lấy post active
    {
      $match: {
        status: "active",
      },
    },

    // 8️⃣ JOIN USER 🔥🔥🔥
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user",
      },
    },

    // 9️⃣ user là object, không phải array
    { $unwind: "$user" },

    // 🔟 Chỉ lấy field cần thiết
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

    // 1️⃣1️⃣ Sort feed (mới + gần)
    {
      $sort: {
        createdAt: -1,
        distanceKm: 1,
      },
    },

    // 1️⃣2️⃣ Limit cho feed
    { $limit: limit },
  ];

  const posts = await Place.aggregate(pipeline);

  if (!posts.length) {
    throw new AppError("No posts found in this area", 404);
  }

  return posts;
};

exports.getPostsAtPoint = async ({ lat, lng }) => {
  const pipeline = [
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [lng, lat],
        },
        distanceField: "distanceMeters",
        maxDistance: 30, //30 meters
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

    {
      $replaceRoot: {
        newRoot: "$posts",
      },
    },

    { $sort: { createdAt: -1 } },
  ];

  const posts = await Place.aggregate(pipeline);

  if (!posts.length) {
    throw new AppError("No posts found at this location", 404);
  }

  return posts;
};
