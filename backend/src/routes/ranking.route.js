const express = require("express");
const router = express.Router();
const rankingController = require("../controllers/ranking.controller");

// Public routes - get featured locations and users
router.get("/featured", rankingController.getFeaturedRanking);

module.exports = router;
