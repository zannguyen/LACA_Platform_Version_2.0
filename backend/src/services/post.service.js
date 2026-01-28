const mongoose = require("mongoose");
const Post = require("../models/post.model");
const Reaction = require("../models/reaction.model");

const createPost = async (data) => {
  return await Post.create({
    userId: new mongoose.Types.ObjectId(data.userId),
    placeId: data.placeId ? new mongoose.Types.ObjectId(data.placeId) : null,
    content: data.content,
    type: data.type,
    status: data.status,
    mediaUrl: data.mediaUrl || [],
    reportCount: 0,
    expireAt: data.expireAt || null, // ✅ thêm vào
  });
};

const getHomePosts = async () => {
  const posts = await Post.find({ status: "active" })
    .sort({ createdAt: -1 })
    .lean();

  for (let p of posts) {
    p.reactionCount = await Reaction.countDocuments({ postId: p._id });
  }

  return posts;
};

module.exports = {
  createPost,
  getHomePosts,
};
