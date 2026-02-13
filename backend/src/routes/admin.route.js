const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");
const auth = require("../middlewares/auth.middleware");

/**
 * Middleware: Check if user is admin
 */
const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Only admins can access this" });
  }
  next();
};

/* =====================================
   ANALYTICS ROUTES (Admin Only)
===================================== */

/**
 * GET /api/admin/analytics
 */
router.get("/analytics", auth, adminOnly, adminController.getAnalytics);

/**
 * GET /api/admin/analytics/stats
 */
router.get(
  "/analytics/stats",
  auth,
  adminOnly,
  adminController.getAnalyticsStats
);

/**
 * GET /api/admin/analytics/growth
 */
router.get(
  "/analytics/growth",
  auth,
  adminOnly,
  adminController.getAnalyticsGrowth
);

/**
 * GET /api/admin/analytics/regions
 */
router.get(
  "/analytics/regions",
  auth,
  adminOnly,
  adminController.getAnalyticsRegions
);

/* =====================================
   LOCATION ROUTES
===================================== */

/**
 * GET /api/admin/locations (public)
 */
router.get("/locations", adminController.getAllLocations);

/**
 * GET /api/admin/locations/:id (public)
 */
router.get("/locations/:id", adminController.getLocationById);

/**
 * POST /api/admin/locations (user & admin)
 */
router.post("/locations", auth, adminController.createLocation);

/**
 * PUT /api/admin/locations/:id (user & admin)
 */
router.put("/locations/:id", auth, adminController.updateLocation);

/**
 * DELETE /api/admin/locations/:id (user & admin)
 */
router.delete("/locations/:id", auth, adminController.deleteLocation);

/**
 * PUT /api/admin/locations/:id/approve (admin only)
 */
router.put(
  "/locations/:id/approve",
  auth,
  adminOnly,
  adminController.approveLocation
);

/**
 * PUT /api/admin/locations/:id/reject (admin only)
 */
router.put(
  "/locations/:id/reject",
  auth,
  adminOnly,
  adminController.rejectLocation
);

module.exports = router;
