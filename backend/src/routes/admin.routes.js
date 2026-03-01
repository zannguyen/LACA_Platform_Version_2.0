// routes/admin.route.js
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/auth.middleware");
const { requireAdmin } = require("../middlewares/requireAdmin");

const adminController = require("../controllers/admin.controller");

// Admin-only for everything in this router
router.use(authMiddleware);
router.use(requireAdmin);

// Dashboard
router.get("/dashboard", adminController.getDashboard);
router.get("/recent-activity", adminController.getRecentActivity);

// Analytics
router.get("/analytics", adminController.getAnalytics);
router.get("/analytics/stats", adminController.getAnalyticsStats);
router.get("/analytics/growth", adminController.getAnalyticsGrowth);
router.get("/analytics/regions", adminController.getAnalyticsRegions);
router.get("/analytics/debug", adminController.debugAnalytics);

// Locations
router.get("/locations", adminController.getAllLocations);
router.get("/locations/:id", adminController.getLocationById);
router.post("/locations", adminController.createLocation);
router.put("/locations/:id", adminController.updateLocation);
router.delete("/locations/:id", adminController.deleteLocation);
router.put("/locations/:id/approve", adminController.approveLocation);
router.put("/locations/:id/reject", adminController.rejectLocation);

module.exports = router;
