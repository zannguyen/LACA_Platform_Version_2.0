const express = require("express");
const router = express.Router();
const { getQueueStats, clearQueue } = require("../services/queue.service");

// Get queue stats
router.get("/api/admin/queue/stats", async (req, res) => {
  try {
    const stats = await getQueueStats();
    return res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Clear queue (admin only)
router.post("/api/admin/queue/clear", async (req, res) => {
  try {
    await clearQueue();
    return res.json({
      success: true,
      message: "Queue cleared",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
