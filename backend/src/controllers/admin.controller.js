const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/appError");

const {
  // dashboard
  getDashboardStats,
  getRecentActivities,

  // analytics
  getAnalyticsStats: getAnalyticsStatsSvc,
  getUserGrowth: getUserGrowthSvc,
  getTopRegions: getTopRegionsSvc,

  // locations (Place)
  getAllLocations: getAllLocationsSvc,
  getLocationById: getLocationByIdSvc,
  createLocation: createLocationSvc,
  updateLocation: updateLocationSvc,
  deleteLocation: deleteLocationSvc,
  approveLocation: approveLocationSvc,
  rejectLocation: rejectLocationSvc,
} = require("../services/admin.service");

// ===============================
// DASHBOARD
// ===============================
exports.getDashboard = asyncHandler(async (req, res) => {
  const data = await getDashboardStats();
  return res.status(200).json(data);
});

exports.getRecentActivity = asyncHandler(async (req, res) => {
  const limit = Math.max(1, Math.min(Number(req.query.limit) || 5, 20));
  const data = await getRecentActivities(limit);
  return res.status(200).json(data);
});

// ===============================
// ANALYTICS
// ===============================

/**
 * GET /api/admin/analytics?days=7|30
 * Summary = stats + growth + regions
 */
exports.getAnalytics = asyncHandler(async (req, res, next) => {
  const days = String(req.query.days || "7");
  if (!["7", "30"].includes(days)) {
    return next(new AppError("Invalid days parameter. Use 7 or 30", 400));
  }

  const [stats, growth, regions] = await Promise.all([
    getAnalyticsStatsSvc(days),
    getUserGrowthSvc(), // service hiện tại không nhận days
    getTopRegionsSvc(4), // service hiện tại không nhận days
  ]);

  return res.status(200).json({
    success: true,
    data: {
      totalUsers: stats.totalUsers,
      onlineUsers: stats.onlineUsers,
      newUsers: stats.newUsers,
      userGrowth: growth,
      topRegions: regions,
    },
  });
});

/**
 * GET /api/admin/analytics/stats?days=7|30
 */
exports.getAnalyticsStats = asyncHandler(async (req, res, next) => {
  const days = String(req.query.days || "7");
  if (!["7", "30"].includes(days)) {
    return next(new AppError("Invalid days parameter. Use 7 or 30", 400));
  }

  const stats = await getAnalyticsStatsSvc(days);

  return res.status(200).json({
    success: true,
    data: stats,
  });
});

/**
 * GET /api/admin/analytics/growth
 */
exports.getAnalyticsGrowth = asyncHandler(async (req, res) => {
  const growth = await getUserGrowthSvc();
  return res.status(200).json({ success: true, data: growth });
});

/**
 * GET /api/admin/analytics/regions?limit=4
 */
exports.getAnalyticsRegions = asyncHandler(async (req, res) => {
  const limit = Math.max(1, Math.min(parseInt(req.query.limit || "4", 10), 20));
  const regions = await getTopRegionsSvc(limit);
  return res.status(200).json({ success: true, data: regions });
});

// ===============================
// LOCATIONS (Place)
// ===============================

/**
 * GET /api/admin/locations?isActive=true|false
 */
exports.getAllLocations = asyncHandler(async (req, res) => {
  const { isActive } = req.query;

  const filter = {};
  if (isActive !== undefined) filter.isActive = isActive === "true";

  const locations = await getAllLocationsSvc(filter);

  return res.status(200).json({
    success: true,
    data: {
      locations,
      count: locations.length,
    },
  });
});

/**
 * GET /api/admin/locations/:id
 */
exports.getLocationById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const location = await getLocationByIdSvc(id);
  if (!location) return next(new AppError("Location not found", 404));

  return res.status(200).json({ success: true, data: location });
});

/**
 * POST /api/admin/locations
 * body supports:
 * - name, address, category, googlePlaceId, isActive
 * - lat/lng OR latitude/longitude
 */
exports.createLocation = asyncHandler(async (req, res, next) => {
  const { name, address, category, googlePlaceId } = req.body;

  const lat =
    req.body.lat !== undefined
      ? Number(req.body.lat)
      : req.body.latitude !== undefined
        ? Number(req.body.latitude)
        : undefined;

  const lng =
    req.body.lng !== undefined
      ? Number(req.body.lng)
      : req.body.longitude !== undefined
        ? Number(req.body.longitude)
        : undefined;

  if (!name || !address || lat === undefined || lng === undefined) {
    return next(
      new AppError("Please provide name, address, latitude/longitude", 400),
    );
  }

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return next(new AppError("Invalid latitude or longitude", 400));
  }

  const locationData = {
    name,
    address,
    category,
    googlePlaceId,
    isActive: req.body.isActive,
    lat,
    lng,
  };

  // userId không bắt buộc (Place schema không dùng), nhưng truyền cũng không sao nếu service ignore
  const newLocation = await createLocationSvc(locationData, req.user?._id);

  return res.status(201).json({
    success: true,
    message: "Location created successfully",
    data: newLocation,
  });
});

/**
 * PUT /api/admin/locations/:id
 * body supports:
 * - name, address, category, googlePlaceId, isActive
 * - lat/lng OR latitude/longitude
 */
exports.updateLocation = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const updateData = { ...req.body };

  // normalize latitude/longitude -> lat/lng
  if (updateData.latitude !== undefined && updateData.lat === undefined) {
    updateData.lat = updateData.latitude;
  }
  if (updateData.longitude !== undefined && updateData.lng === undefined) {
    updateData.lng = updateData.longitude;
  }

  // validate if lat/lng provided
  if (updateData.lat !== undefined || updateData.lng !== undefined) {
    const lat = Number(updateData.lat);
    const lng = Number(updateData.lng);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return next(new AppError("Invalid latitude or longitude", 400));
    }

    updateData.lat = lat;
    updateData.lng = lng;
  }

  const updatedLocation = await updateLocationSvc(id, updateData);
  if (!updatedLocation) return next(new AppError("Location not found", 404));

  return res.status(200).json({
    success: true,
    message: "Location updated successfully",
    data: updatedLocation,
  });
});

/**
 * DELETE /api/admin/locations/:id
 */
exports.deleteLocation = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const deletedLocation = await deleteLocationSvc(id);
  if (!deletedLocation) return next(new AppError("Location not found", 404));

  return res.status(200).json({
    success: true,
    message: "Location deleted successfully",
    data: deletedLocation,
  });
});

/**
 * PUT /api/admin/locations/:id/approve => isActive=true
 */
exports.approveLocation = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const approved = await approveLocationSvc(id);
  if (!approved) return next(new AppError("Location not found", 404));

  return res.status(200).json({
    success: true,
    message: "Location approved successfully",
    data: approved,
  });
});

/**
 * PUT /api/admin/locations/:id/reject => isActive=false
 */
exports.rejectLocation = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const rejected = await rejectLocationSvc(id);
  if (!rejected) return next(new AppError("Location not found", 404));

  return res.status(200).json({
    success: true,
    message: "Location rejected successfully",
    data: rejected,
  });
});
