const express = require("express");
const {
  getDashboard,
  getRecentActivity,
} = require("../controllers/admin.controller");
const { requireAdmin } = require("../middlewares/requireAdmin");

const router = express.Router();

router.get("/dashboard", requireAdmin, getDashboard);
router.get("/recent-activity", requireAdmin, getRecentActivity);

module.exports = router;
