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

exports.getPostsAtPoint = async ({ lat, lng, userLat, userLng }) => {
  // Kiểm tra nếu có vị trí user, validate khoảng cách
  if (userLat && userLng) {
    const distance = calculateDistance(userLat, userLng, lat, lng);

    // Kiểm tra nếu điểm click nằm ngoài bán kính 5km
    if (distance > 5) {
      throw new AppError(
        "Bạn không thể xem bài viết ở vị trí này. Vui lòng di chuyển đến gần hơn (trong bán kính 5km)",
        403,
      );
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

    // 8️⃣ JOIN USER info
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user",
      },
    },

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
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return distance;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}
