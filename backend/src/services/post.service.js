const mongoose = require("mongoose");
const Post = require("../models/post.model");
const Reaction = require("../models/reaction.model");
const AppError = require("../utils/appError");
const PostAnalysis = require("../models/postAnalysis.model");
const claudeService = require("./claude.service");

const createPost = async (data) => {
  const post = await Post.create({
    userId: new mongoose.Types.ObjectId(data.userId),
    placeId: data.placeId ? new mongoose.Types.ObjectId(data.placeId) : null,
    content: data.content,
    type: data.type,
    status: data.status,
    mediaUrl: data.mediaUrl || [],
    reportCount: 0,
    expireAt: data.expireAt || null, // ✅ thêm vào
  });

  // Trigger analysis asynchronously (fire-and-forget)
  triggerPostAnalysis(post._id, data);

  return post;
};

/**
 * Trigger post analysis asynchronously
 * This is fire-and-forget - errors don't break post creation
 */
const triggerPostAnalysis = async (postId, postData) => {
  try {
    // Get place info if available
    let place = null;
    if (postData.placeId) {
      const Place = require("../models/place.model");
      place = await Place.findById(postData.placeId);
    }

    // Analyze content
    const analysisResult = await claudeService.analyzePostContent({
      content: postData.content,
      mediaUrl: postData.mediaUrl,
      place,
    });

    if (!analysisResult) {
      return; // Skip if analysis failed
    }

    // Save analysis
    const analysis = await PostAnalysis.create({
      postId,
      topics: analysisResult.topics,
      confidence: analysisResult.confidence,
      summary: analysisResult.summary,
    });

    // Update post with analysisId
    await Post.findByIdAndUpdate(postId, { analysisId: analysis._id });

    // Emit Socket.IO event if available
    const io = global.io;
    if (io) {
      io.emit("post_analysis_complete", {
        postId: String(postId),
        analysis: {
          topics: analysis.topics,
          confidence: analysis.confidence,
          summary: analysis.summary,
        },
      });
    }
  } catch (error) {
    console.error("Error triggering post analysis:", error.message);
    // Silently fail - don't break post creation
  }
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
