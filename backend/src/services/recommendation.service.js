const mongoose = require("mongoose");
const Post = require("../models/post.model");
const User = require("../models/user.model");
const Tag = require("../models/tag.model");

/**
 * Content-Based Recommendation System
 * Recommends posts based on user interests, tags, location, and engagement
 */

/**
 * Calculate tag match score
 * Compares post tags with user interests
 */
const calculateTagScore = (postTags = [], userInterests = []) => {
  if (!postTags.length || !userInterests.length) return 0;

  const userInterestIds = userInterests.map((i) =>
    typeof i === "string" ? i : i._id?.toString()
  );

  const matchingTags = postTags.filter((tag) =>
    userInterestIds.some(
      (interest) => interest === tag._id?.toString() || interest === tag.toString()
    )
  );

  return matchingTags.length / postTags.length;
};

/**
 * Calculate interest match score
 * Compares post topics with user interests
 */
const calculateInterestScore = (postTopics = [], userInterests = []) => {
  if (!postTopics.length || !userInterests.length) return 0;

  const userInterestNames = userInterests.map((i) =>
    typeof i === "string" ? i.toLowerCase() : i.name?.toLowerCase()
  );

  const matchingTopics = postTopics.filter((topic) =>
    userInterestNames.some(
      (interest) =>
        interest.includes(topic.toLowerCase()) ||
        topic.toLowerCase().includes(interest)
    )
  );

  return matchingTopics.length / postTopics.length;
};

/**
 * Calculate location match score
 * Gives preference to posts from places user visited/interested in
 */
const calculateLocationScore = (postPlaceId, userVisitedPlaces = []) => {
  if (!postPlaceId || !userVisitedPlaces.length) return 0.3; // Neutral score

  // Check if user visited or interacted with this place
  const visitedPlace = userVisitedPlaces.some(
    (id) => id.toString() === postPlaceId.toString()
  );

  return visitedPlace ? 1 : 0.3;
};

/**
 * Calculate recency score
 * Recent posts are weighted higher
 */
const calculateRecencyScore = (postCreatedAt) => {
  const now = new Date();
  const postDate = new Date(postCreatedAt);
  const hoursDiff = (now - postDate) / (1000 * 60 * 60);

  // Score decreases over time: 1.0 for 1hr old, 0.5 for 24hrs old, 0.1 for 1week+
  if (hoursDiff <= 1) return 1.0;
  if (hoursDiff <= 24) return 1.0 - hoursDiff / 48;
  if (hoursDiff <= 168) return 0.5 - hoursDiff / 336;
  return 0.1;
};

/**
 * Calculate engagement score
 * Popular posts (likes, comments) ranked higher
 */
const calculateEngagementScore = (reactionCount = 0, commentCount = 0) => {
  // Normalize: assume max 100 reactions/comments
  const normalizedReactions = Math.min(reactionCount / 100, 1);
  const normalizedComments = Math.min(commentCount / 50, 1);

  return normalizedReactions * 0.7 + normalizedComments * 0.3;
};

/**
 * Get personalized posts for a user based on interests and tags
 * @param {string} userId - User ID
 * @param {number} limit - Number of posts to return
 * @param {number} skip - Number of posts to skip (pagination)
 * @returns {Promise<Array>} - Ranked posts
 */
const getRecommendedPosts = async (userId, limit = 20, skip = 0) => {
  try {
    // Fetch user with interests
    const user = await User.findById(userId).populate("interests");
    if (!user) {
      throw new Error("User not found");
    }

    // Get all active posts with related data and populated tags
    const posts = await Post.find({ status: "active" })
      .populate("userId", "name avatar")
      .populate("placeId", "name category")
      .populate("tags", "name categoryId")
      .lean();

    // Calculate recommendation score for each post
    const rankedPosts = posts
      .map((post) => {
        // Get post topics (from tags, place category, and post type)
        const postTopics = [];

        // Add tag names to topics
        if (post.tags && post.tags.length > 0) {
          postTopics.push(...post.tags.map((tag) => tag.name));
        }

        // Add place info
        if (post.placeId) {
          postTopics.push(post.placeId.category);
          postTopics.push(post.placeId.name);
        }

        // Add post type
        if (post.type) {
          postTopics.push(post.type);
        }

        // Calculate individual scores
        const tagScore = calculateTagScore(post.tags || [], user.interests || []);
        const interestScore = calculateInterestScore(
          postTopics,
          user.interests
        );
        const locationScore = calculateLocationScore(
          post.placeId?._id,
          user.visitedPlaces || []
        );
        const recencyScore = calculateRecencyScore(post.createdAt);
        const engagementScore = calculateEngagementScore(
          post.reactionCount || 0,
          post.commentCount || 0
        );

        // Weighted total score
        // Tags are now the PRIMARY signal (50% weight)
        // Interest=25%, Location=15%, Recency=7%, Engagement=3%
        const totalScore =
          tagScore * 0.5 +
          interestScore * 0.25 +
          locationScore * 0.15 +
          recencyScore * 0.07 +
          engagementScore * 0.03;

        return {
          ...post,
          recommendationScore: totalScore,
          scoreBreakdown: {
            tagScore,
            interestScore,
            locationScore,
            recencyScore,
            engagementScore,
          },
        };
      })
      .filter((post) => post.recommendationScore > 0) // Only posts with some relevance
      .sort((a, b) => b.recommendationScore - a.recommendationScore) // Highest score first
      .slice(skip, skip + limit);

    return rankedPosts;
  } catch (error) {
    console.error("[ Recommendation] Error getting recommendations:", error.message);
    throw error;
  }
};

/**
 * Get trending posts based on engagement (fallback when no interests)
 */
const getTrendingPosts = async (limit = 20, skip = 0) => {
  try {
    const posts = await Post.find({ status: "active" })
      .populate("userId", "name avatar")
      .populate("placeId", "name category")
      .populate("tags", "name categoryId")
      .sort({ reactionCount: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return posts;
  } catch (error) {
    console.error("[ Recommendation] Error getting trending posts:", error.message);
    throw error;
  }
};

/**
 * Get posts by specific interest
 */
const getPostsByInterest = async (interestId, limit = 20, skip = 0) => {
  try {
    // Get interest details
    const Interest = require("../models/interest.model");
    const interest = await Interest.findById(interestId);

    if (!interest) {
      throw new Error("Interest not found");
    }

    // Find posts that match this interest
    const posts = await Post.find({ status: "active" })
      .populate("userId", "name avatar")
      .populate("placeId", "name category")
      .populate("tags", "name categoryId")
      .lean();

    // Filter posts matching interest (simple keyword matching)
    const filtered = posts.filter((post) => {
      const searchText = [
        post.content,
        post.type,
        post.placeId?.category,
        post.placeId?.name,
        ...(post.tags ? post.tags.map((tag) => tag.name) : []),
      ]
        .join(" ")
        .toLowerCase();

      return searchText.includes(interest.name.toLowerCase());
    });

    return filtered.slice(skip, skip + limit);
  } catch (error) {
    console.error("[ Recommendation] Error getting posts by interest:", error.message);
    throw error;
  }
};

/**
 * Get posts by specific tag
 */
const getPostsByTag = async (tagId, limit = 20, skip = 0) => {
  try {
    // Verify tag exists
    const tag = await Tag.findById(tagId);
    if (!tag) {
      throw new Error("Tag not found");
    }

    // Find posts with this tag
    const posts = await Post.find({ tags: tagId, status: "active" })
      .populate("userId", "name avatar")
      .populate("placeId", "name category")
      .populate("tags", "name categoryId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return posts;
  } catch (error) {
    console.error("[ Recommendation] Error getting posts by tag:", error.message);
    throw error;
  }
};

module.exports = {
  getRecommendedPosts,
  getTrendingPosts,
  getPostsByInterest,
  getPostsByTag,
  calculateTagScore,
  calculateInterestScore,
  calculateLocationScore,
  calculateRecencyScore,
  calculateEngagementScore,
};

