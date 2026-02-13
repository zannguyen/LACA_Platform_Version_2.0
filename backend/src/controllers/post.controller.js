// controllers/post.controller.js
const service = require("../services/post.service");
const Post = require("../models/post.model");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/appError");
const mongoose = require("mongoose");

const create = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    // ✅ accept string hoặc array
    const rawMediaUrl = req.body.mediaUrl;
    const mediaUrl = Array.isArray(rawMediaUrl)
      ? rawMediaUrl
      : rawMediaUrl
        ? [rawMediaUrl]
        : [];

    const post = await service.createPost({
      userId: req.user.id,
      placeId: req.body.placeId || null,
      content: req.body.content || "",
      type: req.body.type || "text",
      status: "active",
      mediaUrl,
      reportCount: 0,
      expireAt: req.body.expireAt || null,
    });

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

// ✅ create post + upload cloudinary
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

    const post = await service.createPost({
      userId: req.user.id,
      placeId: req.body.placeId || null,
      content: req.body.content || "",
      type,
      status: "active",
      mediaUrl,
      reportCount: 0,
      expireAt: null,
    });

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
    const posts = await Post.find({ status: "active" })
      .populate("userId", "fullname username avatar")
      .populate("placeId", "name")
      .sort({ createdAt: -1 })
      .limit(20);

    return res.json(posts);
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
  if (!mongoose.Types.ObjectId.isValid(postId)) throw new AppError("Invalid postId", 400);

  const result = await service.deletePost({ postId, userId });
  return res.status(200).json({ success: true, message: "Post deleted", ...result });
});

module.exports = { create, createWithMedia, getHomePosts, deletePost };
