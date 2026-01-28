const Place = require("../models/place.model");
const AppError = require("../utils/appError");

exports.getPostsInRadius = async ({ lat, lng }) => {
  const pipeline = [
    {
      // 1️⃣ Tìm các PLACE gần user
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [lng, lat],
        },
        distanceField: "distanceMeters",
        maxDistance: Number(5000), // m
        spherical: true,
      },
    },

    // 2️⃣ Giới hạn số place (tối ưu)
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

    // 4️⃣ Bỏ place không có post
    {
      $unwind: "$posts",
    },

    // 5️⃣ Gắn distance vào post
    {
      $addFields: {
        "posts.distanceKm": {
          $round: [{ $divide: ["$distanceMeters", 1000] }, 2],
        },
      },
    },

    // 6️⃣ Trả về post làm root
    {
      $replaceRoot: { newRoot: "$posts" },
    },
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
