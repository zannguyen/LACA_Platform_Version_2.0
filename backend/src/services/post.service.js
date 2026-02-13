const mongoose = require("mongoose");
const Post = require("../models/post.model");
const Reaction = require("../models/reaction.model");
const AppError = require("../utils/appError");

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
  // hard delete
  deletePost: async ({ postId, userId }) => {
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      throw new AppError("Invalid postId", 400);
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new AppError("Invalid userId", 400);
    }

    const post = await Post.findById(postId);
    if (!post) throw new AppError("Post not found", 404);

    if (String(post.userId) !== String(userId)) {
      throw new AppError("You do not have permission to delete this post", 403);
    }

    await Promise.all([
      Reaction.deleteMany({ postId: post._id }),
      post.deleteOne(),
    ]);

    return { postId: String(post._id) };
  },
};
