const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const analysisController = require("../controllers/analysis.controller");

// Public routes
router.get("/trending", analysisController.getTrendingTopics);
router.get("/post/:postId", analysisController.getPostAnalysis);

// Protected routes
router.post("/analyze/:postId", auth, analysisController.analyzePost);
router.get("/recommendations", auth, analysisController.getRecommendedTopics);

module.exports = router;
