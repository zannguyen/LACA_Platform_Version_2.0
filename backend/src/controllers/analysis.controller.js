const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/appError");
const PostAnalysis = require("../models/postAnalysis.model");
const Post = require("../models/post.model");
const User = require("../models/user.model");
const claudeService = require("../services/claude.service");

/**
 * Analyze a post and store results
 * POST /api/analysis/analyze/:postId
 */
const analyzePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  // Check if post exists
  const post = await Post.findById(postId).populate("placeId");
  if (!post) {
    throw new AppError("Post not found", 404);
  }

  // Check if already analyzed
  let analysis = await PostAnalysis.findOne({ postId });
  if (analysis) {
    return res.status(200).json({
      success: true,
      data: analysis,
    });
  }

  // Analyze post content
  const analysisResult = await claudeService.analyzePostContent({
    content: post.content,
    mediaUrl: post.mediaUrl,
    place: post.placeId,
  });

  if (!analysisResult) {
    throw new AppError("Failed to analyze post", 500);
  }

  // Save analysis
  analysis = await PostAnalysis.create({
    postId,
    topics: analysisResult.topics,
    confidence: analysisResult.confidence,
    summary: analysisResult.summary,
  });

  // Update post with analysisId
  await Post.findByIdAndUpdate(postId, { analysisId: analysis._id });

  res.status(201).json({
    success: true,
    data: analysis,
  });
});

/**
 * Get analysis for a post
 * GET /api/analysis/post/:postId
 */
const getPostAnalysis = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  const analysis = await PostAnalysis.findOne({ postId });
  if (!analysis) {
    return res.status(200).json({
      success: true,
      data: null,
    });
  }

  res.status(200).json({
    success: true,
    data: analysis,
  });
});

/**
 * Get trending topics from recent posts
 * GET /api/analysis/trending
 */
const getTrendingTopics = asyncHandler(async (req, res) => {
  const { days = 7, limit = 10 } = req.query;

  // Get recent analyses
  const daysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const recentAnalyses = await PostAnalysis.find({
    createdAt: { $gte: daysAgo },
  });

  // Get trending topics
  const topicCounts = {};
  recentAnalyses.forEach((analysis) => {
    if (analysis.topics && Array.isArray(analysis.topics)) {
      analysis.topics.forEach((topic) => {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      });
    }
  });

  const trendingTopics = Object.entries(topicCounts)
    .map(([topic, count]) => ({
      topic,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, parseInt(limit));

  res.status(200).json({
    success: true,
    data: trendingTopics,
  });
});

/**
 * Get recommended topics for current user
 * GET /api/analysis/recommendations
 */
const getRecommendedTopics = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { days = 7, limit = 5 } = req.query;

  // Get user with interests
  const user = await User.findById(userId).populate("interests");
  if (!user) {
    throw new AppError("User not found", 404);
  }

  // Get trending topics
  const daysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const recentAnalyses = await PostAnalysis.find({
    createdAt: { $gte: daysAgo },
  });

  const topicCounts = {};
  recentAnalyses.forEach((analysis) => {
    if (analysis.topics && Array.isArray(analysis.topics)) {
      analysis.topics.forEach((topic) => {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      });
    }
  });

  const trendingTopics = Object.entries(topicCounts)
    .map(([topic, count]) => ({
      topic,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  // Get user interest names
  const userInterestNames = user.interests.map((i) => i.name.toLowerCase());

  // Filter topics that match user interests
  const recommendedTopics = trendingTopics
    .filter((t) =>
      userInterestNames.some((interest) => t.topic.toLowerCase().includes(interest))
    )
    .slice(0, parseInt(limit));

  // If no matches, return top trending
  const finalRecommendations =
    recommendedTopics.length > 0
      ? recommendedTopics
      : trendingTopics.slice(0, parseInt(limit));

  res.status(200).json({
    success: true,
    data: finalRecommendations,
  });
});

module.exports = {
  analyzePost,
  getPostAnalysis,
  getTrendingTopics,
  getRecommendedTopics,
};
