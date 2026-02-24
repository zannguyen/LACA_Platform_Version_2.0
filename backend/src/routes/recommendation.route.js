const express = require("express");
const router = express.Router();
const recommendationService = require("../services/recommendation.service");
const authMiddleware = require("../middlewares/auth.middleware");

/**
 * GET /api/recommendations/feed
 * Get personalized feed for logged-in user based on their interests
 */
router.get("/feed", authMiddleware, async (req, res, next) => {
  try {
    const { limit = 20, skip = 0 } = req.query;
    const userId = req.user.id;

    const posts = await recommendationService.getRecommendedPosts(
      userId,
      parseInt(limit),
      parseInt(skip)
    );

    res.status(200).json({
      success: true,
      count: posts.length,
      data: posts,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/recommendations/trending
 * Get trending posts (no auth required)
 */
router.get("/trending", async (req, res, next) => {
  try {
    const { limit = 20, skip = 0 } = req.query;

    const posts = await recommendationService.getTrendingPosts(
      parseInt(limit),
      parseInt(skip)
    );

    res.status(200).json({
      success: true,
      count: posts.length,
      data: posts,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/recommendations/interest/:interestId
 * Get posts for a specific interest
 */
router.get("/interest/:interestId", async (req, res, next) => {
  try {
    const { limit = 20, skip = 0 } = req.query;
    const { interestId } = req.params;

    const posts = await recommendationService.getPostsByInterest(
      interestId,
      parseInt(limit),
      parseInt(skip)
    );

    res.status(200).json({
      success: true,
      count: posts.length,
      data: posts,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/recommendations/tag/:tagId
 * Get posts for a specific tag
 */
router.get("/tag/:tagId", async (req, res, next) => {
  try {
    const { limit = 20, skip = 0 } = req.query;
    const { tagId } = req.params;

    const posts = await recommendationService.getPostsByTag(
      tagId,
      parseInt(limit),
      parseInt(skip)
    );

    res.status(200).json({
      success: true,
      count: posts.length,
      data: posts,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
