const Post = require("../models/post.model");
const Place = require("../models/place.model");
const Reaction = require("../models/reaction.model");
const User = require("../models/user.model");

const getFeaturedRanking = async (req, res) => {
  try {
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    // ============ TOP 3 LOCATIONS (by post count this month) ============
    const topLocations = await Post.aggregate([
      {
        $match: {
          createdAt: { $gte: currentMonth },
          placeId: { $ne: null },
        },
      },
      {
        $group: {
          _id: "$placeId",
          postCount: { $sum: 1 },
        },
      },
      {
        $sort: { postCount: -1 },
      },
      {
        $limit: 3,
      },
      {
        $lookup: {
          from: "places",
          localField: "_id",
          foreignField: "_id",
          as: "placeInfo",
        },
      },
      {
        $unwind: {
          path: "$placeInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 0,
          placeId: "$_id",
          name: { $ifNull: ["$placeInfo.name", "Unknown Place"] },
          address: { $ifNull: ["$placeInfo.address", ""] },
          category: { $ifNull: ["$placeInfo.category", "other"] },
          location: "$placeInfo.location",
          postCount: 1,
        },
      },
    ]);

    // ============ TOP 3 USERS (by total likes this month) ============
    // First get top posts by likes, then aggregate by user
    const topUsers = await Reaction.aggregate([
      {
        $match: {
          createdAt: { $gte: currentMonth },
          type: "heart",
        },
      },
      {
        $group: {
          _id: "$postId",
          likeCount: { $sum: 1 },
        },
      },
      {
        $sort: { likeCount: -1 },
      },
      {
        $lookup: {
          from: "posts",
          localField: "_id",
          foreignField: "_id",
          as: "postInfo",
        },
      },
      {
        $unwind: {
          path: "$postInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$postInfo.userId",
          totalLikes: { $sum: "$likeCount" },
          postCount: { $sum: 1 },
        },
      },
      {
        $sort: { totalLikes: -1 },
      },
      {
        $limit: 3,
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      {
        $unwind: {
          path: "$userInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 0,
          userId: "$_id",
          username: { $ifNull: ["$userInfo.username", "Unknown User"] },
          fullname: { $ifNull: ["$userInfo.fullname", ""] },
          avatar: { $ifNull: ["$userInfo.avatar", ""] },
          totalLikes: 1,
          postCount: 1,
        },
      },
    ]);

    // If no reactions yet, fallback to getting users with most posts
    if (topUsers.length === 0) {
      const fallbackUsers = await Post.aggregate([
        {
          $match: {
            createdAt: { $gte: currentMonth },
          },
        },
        {
          $group: {
            _id: "$userId",
            postCount: { $sum: 1 },
          },
        },
        {
          $sort: { postCount: -1 },
        },
        {
          $limit: 3,
        },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "userInfo",
          },
        },
        {
          $unwind: {
            path: "$userInfo",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 0,
            userId: "$_id",
            username: { $ifNull: ["$userInfo.username", "Unknown User"] },
            fullname: { $ifNull: ["$userInfo.fullname", ""] },
            avatar: { $ifNull: ["$userInfo.avatar", ""] },
            totalLikes: 0,
            postCount: 1,
          },
        },
      ]);

      return res.json({
        success: true,
        data: {
          locations: topLocations,
          users: fallbackUsers,
        },
      });
    }

    res.json({
      success: true,
      data: {
        locations: topLocations,
        users: topUsers,
      },
    });
  } catch (error) {
    console.error("Error in getFeaturedRanking:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = {
  getFeaturedRanking,
};
