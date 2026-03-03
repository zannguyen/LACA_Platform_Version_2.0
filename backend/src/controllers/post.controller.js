// controllers/post.controller.js
const service = require("../services/post.service");
const Post = require("../models/post.model");

const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/appError");
const mongoose = require("mongoose");

const UserService = require("../services/user.service");
const notifService = require("../services/notification.service");

const create = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    // accept string hoặc array
    const rawMediaUrl = req.body.mediaUrl;
    const mediaUrl = Array.isArray(rawMediaUrl)
      ? rawMediaUrl
      : rawMediaUrl
        ? [rawMediaUrl]
        : [];

    // Calculate expireAt based on expireHours (-1 = never expire)
    let expireAt = null;
    const expireHours = parseInt(req.body.expireHours) || -1;
    if (expireHours > 0) {
      expireAt = new Date(Date.now() + expireHours * 60 * 60 * 1000);
    }

    const post = await service.createPost({
      userId: req.user.id,
      placeId: req.body.placeId || null,
      content: req.body.content || "",
      type: req.body.type || "text",
      status: "active",
      mediaUrl,
      reportCount: 0,
      expireAt,
      tags: req.body.tags || [],
    });

    // Notify all followers (fire & forget)
    try {
      const io = req.app.get("io");
      const author = await require("../models/user.model")
        .findById(req.user.id)
        .select("fullname username");
      const mutualUserIds = await UserService.getMutualFollowUserIds(
        req.user.id,
      );

      const notifyName = author?.fullname || author?.username || "Ai đó";
      await Promise.all(
        mutualUserIds.map((userId) =>
          notifService.createAndEmit(io, {
            recipientId: userId,
            senderId: req.user.id,
            type: "new_post",
            title: `${notifyName} vừa đăng bài viết mới`,
            body: post.content ? post.content.substring(0, 100) : "Xem ngay!",
            link: `/posts/${post._id}`,
            refId: post._id,
            refModel: "Post",
          }),
        ),
      );
    } catch (notifErr) {
      console.error("[Notification] new_post error:", notifErr.message);
    }

    return res.status(201).json({
      success: true,
      message: "Create post success",
      data: post,
    });
  } catch (error) {
    console.error("Create post error:", error);
    return res.status(500).json({ message: "Create post failed" });
  }
};

// create post + upload cloudinary
const createWithMedia = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const files = req.files || [];
    const mediaUrl = files.map((f) => f.path || f.secure_url).filter(Boolean);

    let type = req.body.type;
    if (!type) {
      if (files.some((f) => (f.mimetype || "").startsWith("video/")))
        type = "video";
      else if (mediaUrl.length > 0) type = "image";
      else type = "text";
    }

    // Calculate expireAt based on expireHours (-1 = never expire)
    let expireAt = null;
    const expireHours = parseInt(req.body.expireHours) || -1;
    if (expireHours > 0) {
      expireAt = new Date(Date.now() + expireHours * 60 * 60 * 1000);
    }

    const post = await service.createPost({
      userId: req.user.id,
      placeId: req.body.placeId || null,
      content: req.body.content || "",
      type,
      status: "active",
      mediaUrl,
      reportCount: 0,
      expireAt,
      tags: req.body.tags || [],
    });

    // Notify all followers (fire & forget)
    try {
      const io = req.app.get("io");
      const author = await require("../models/user.model")
        .findById(req.user.id)
        .select("fullname username");
      const mutualUserIds = await UserService.getMutualFollowUserIds(
        req.user.id,
      );

      const notifyName = author?.fullname || author?.username || "Ai đó";
      await Promise.all(
        mutualUserIds.map((userId) =>
          notifService.createAndEmit(io, {
            recipientId: userId,
            senderId: req.user.id,
            type: "new_post",
            title: `${notifyName} vừa đăng bài viết mới`,
            body: post.content ? post.content.substring(0, 100) : "Xem ngay!",
            link: `/posts/${post._id}`,
            refId: post._id,
            refModel: "Post",
          }),
        ),
      );
    } catch (notifErr) {
      console.error("[Notification] new_post (media) error:", notifErr.message);
    }

    return res.status(201).json({
      success: true,
      message: "Create post with media success",
      data: post,
    });
  } catch (error) {
    console.error("Create post with media error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Create post with media failed",
    });
  }
};

const getHomePosts = async (req, res) => {
  try {
    let blockedUserIds = [];
    let userPreferredTagIds = [];
    let userInterestNames = [];
    let followingUserIds = new Set(); // Users that current user follows
    let followerUserIds = new Set(); // Users that follow current user
    const currentUserId = req.user?.id;

    if (currentUserId) {
      blockedUserIds = await UserService.getBlockedUserIds(currentUserId);

      // Get user's preferred tags and interests for recommendations
      const User = require("../models/user.model");
      const user = await User.findById(currentUserId)
        .populate("preferredTags")
        .populate("interests");

      if (user) {
        // Get preferredTags IDs
        if (user.preferredTags && user.preferredTags.length > 0) {
          userPreferredTagIds = user.preferredTags.map((tag) => tag._id.toString());
        }

        // Get interest names for broader matching
        if (user.interests && user.interests.length > 0) {
          userInterestNames = user.interests
            .map((interest) => {
              if (typeof interest === "object" && interest.name) {
                return interest.name.toLowerCase();
              }
              return String(interest).toLowerCase();
            })
            .filter(Boolean);
        }

        // Get following and followers list for mutual follow check
        if (user.following && user.following.length > 0) {
          user.following.forEach((id) => followingUserIds.add(id.toString()));
        }
        if (user.followers && user.followers.length > 0) {
          user.followers.forEach((id) => followerUserIds.add(id.toString()));
        }
      }
    }

    const query = { status: "active" };
    if (blockedUserIds.length) query.userId = { $nin: blockedUserIds };

    // Fetch posts with tags populated
    const posts = await Post.find(query)
      .populate("userId", "fullname username avatar")
      .populate("placeId", "name")
      .populate("tags", "name")
      .sort({ createdAt: -1 })
      .limit(50) // Get more posts for sorting
      .lean();

    // Separate posts into matching and non-matching based on user's preferred tags
    const matchingPosts = [];
    const nonMatchingPosts = [];

    posts.forEach((post) => {
      // Add follow status to post's user
      const postUserId = post.userId?._id?.toString();
      const isFollowing = postUserId ? followingUserIds.has(postUserId) : false;
      const isFollowed = postUserId ? followerUserIds.has(postUserId) : false;

      // Attach follow status to user object for frontend to check mutual follow
      if (post.userId && typeof post.userId === "object") {
        post.userId = {
          ...post.userId,
          isFollowing,
          isFollowed,
        };
      }

      // Check if post has tags that match user's preferred tags (by ID)
      const postTagIds = post.tags ? post.tags.map((tag) => tag._id.toString()) : [];
      const postTagNames = post.tags
        ? post.tags.map((tag) => tag.name?.toLowerCase()).filter(Boolean)
        : [];

      // Check for tag ID match
      const hasMatchingTagId = postTagIds.some((tagId) =>
        userPreferredTagIds.includes(tagId)
      );

      // Check for interest name match (if user has interests)
      const hasMatchingInterest =
        userInterestNames.length > 0 &&
        userInterestNames.some((interestName) =>
          postTagNames.some((tagName) => tagName?.includes(interestName))
        );

      const hasMatchingTag = hasMatchingTagId || hasMatchingInterest;

      if (hasMatchingTag) {
        matchingPosts.push({ ...post, isRecommended: true });
      } else {
        nonMatchingPosts.push({ ...post, isRecommended: false });
      }
    });

    // Sort each group by newest first
    matchingPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    nonMatchingPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Combine: matching posts first, then non-matching
    const sortedPosts = [...matchingPosts, ...nonMatchingPosts].slice(0, 20);

    return res.json(sortedPosts);
  } catch (error) {
    console.error("Get home posts error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// DELETE /api/posts/:postId (Auth required)
// Hard delete: remove the post document from DB.
// Only the owner of the post can delete.
const deletePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const userId = req.user?.id;

  if (!userId) throw new AppError("Unauthorized", 401);
  if (!mongoose.Types.ObjectId.isValid(postId))
    throw new AppError("Invalid postId", 400);

  const result = await service.deletePost({ postId, userId });
  return res
    .status(200)
    .json({ success: true, message: "Post deleted", ...result });
});

// Get single post detail
const getPostDetail = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

    const post = await Post.findById(postId)
      .populate("userId", "fullname username avatar")
      .populate("placeId", "name")
      .populate("tags", "name color")
      .lean();

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Get reactions for this post
    const Reaction = require("../models/reaction.model");
    const reactions = await Reaction.find({ postId })
      .populate("userId", "fullname username avatar")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      data: {
        ...post,
        reactions,
        commentCount: 0, // Comment feature not implemented yet
        isLiked: reactions.some(r => r.userId?._id?.toString() === userId),
        likeCount: reactions.length,
      },
    });
  } catch (error) {
    console.error("Get post detail error:", error);
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { create, createWithMedia, getHomePosts, getPostDetail, deletePost };
