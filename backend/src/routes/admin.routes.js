// routes/admin.route.js (dashboard)
const express = require("express");
const {
  getDashboard,
  getRecentActivity,
} = require("../controllers/admin.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { requireAdmin } = require("../middlewares/requireAdmin");

const router = express.Router();

router.use(authMiddleware);
router.use(requireAdmin);

router.get("/dashboard", getDashboard);
router.get("/recent-activity", getRecentActivity);

module.exports = router;
