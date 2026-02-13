const adminService = require("../services/admin.service");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/appError");

/* =====================================
   ANALYTICS CONTROLLERS
===================================== */

/**
 * GET /api/admin/analytics
 * Lấy analytics data (stats, growth, regions)
 */
exports.getAnalytics = asyncHandler(async (req, res, next) => {
  const { days = 7 } = req.query;

  // Validate days parameter
  if (!["7", "30"].includes(days)) {
    return next(new AppError("Invalid days parameter. Use 7 or 30", 400));
  }

  // Fetch data từ service
  const [stats, growth, regions] = await Promise.all([
    adminService.getAnalyticsStats(days),
    adminService.getUserGrowth(),
    adminService.getTopRegions(4),
  ]);

  res.status(200).json({
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
 * GET /api/admin/analytics/stats
 * Chỉ lấy stats (totalUsers, onlineUsers, newUsers)
 */
exports.getAnalyticsStats = asyncHandler(async (req, res, next) => {
  const { days = 7 } = req.query;

  if (!["7", "30"].includes(days)) {
    return next(new AppError("Invalid days parameter. Use 7 or 30", 400));
  }

  const stats = await adminService.getAnalyticsStats(days);

  res.status(200).json({
    success: true,
    data: stats,
  });
});

/**
 * GET /api/admin/analytics/growth
 * Lấy user growth chart data
 */
exports.getAnalyticsGrowth = asyncHandler(async (req, res, next) => {
  const growth = await adminService.getUserGrowth();

  res.status(200).json({
    success: true,
    data: growth,
  });
});

/**
 * GET /api/admin/analytics/regions
 * Lấy top regions data
 */
exports.getAnalyticsRegions = asyncHandler(async (req, res, next) => {
  const { limit = 4 } = req.query;

  const regions = await adminService.getTopRegions(parseInt(limit));

  res.status(200).json({
    success: true,
    data: regions,
  });
});

/* =====================================
   LOCATION CONTROLLERS
===================================== */

/**
 * GET /api/admin/locations
 * Lấy danh sách tất cả locations
 */
exports.getAllLocations = asyncHandler(async (req, res, next) => {
  const { status } = req.query;

  // Build filter
  const filter = {};
  if (status) {
    filter.status = status;
  }

  const locations = await adminService.getAllLocations(filter);

  res.status(200).json({
    success: true,
    data: {
      locations,
      count: locations.length,
    },
  });
});

/**
 * GET /api/admin/locations/:id
 * Lấy location theo ID
 */
exports.getLocationById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const location = await adminService.getLocationById(id);

  if (!location) {
    return next(new AppError("Location not found", 404));
  }

  res.status(200).json({
    success: true,
    data: location,
  });
});

/**
 * POST /api/admin/locations
 * Tạo location mới
 */
exports.createLocation = asyncHandler(async (req, res, next) => {
  const { name, address, latitude, longitude, description, image } = req.body;

  // Validate required fields
  if (!name || !address || latitude === undefined || longitude === undefined) {
    return next(
      new AppError(
        "Please provide name, address, latitude, longitude",
        400
      )
    );
  }

  // Validate coordinates
  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return next(new AppError("Invalid latitude or longitude", 400));
  }

  const locationData = {
    name,
    address,
    latitude,
    longitude,
    description,
    image,
  };

  const newLocation = await adminService.createLocation(
    locationData,
    req.user._id
  );

  res.status(201).json({
    success: true,
    message: "Location created successfully",
    data: newLocation,
  });
});

/**
 * PUT /api/admin/locations/:id
 * Cập nhật location
 */
exports.updateLocation = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const updateData = req.body;

  // Validate coordinates if provided
  if (updateData.latitude !== undefined || updateData.longitude !== undefined) {
    const lat = updateData.latitude ?? 0;
    const lng = updateData.longitude ?? 0;

    if (
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return next(new AppError("Invalid latitude or longitude", 400));
    }
  }

  const updatedLocation = await adminService.updateLocation(id, updateData);

  if (!updatedLocation) {
    return next(new AppError("Location not found", 404));
  }

  res.status(200).json({
    success: true,
    message: "Location updated successfully",
    data: updatedLocation,
  });
});

/**
 * DELETE /api/admin/locations/:id
 * Xóa location
 */
exports.deleteLocation = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const deletedLocation = await adminService.deleteLocation(id);

  if (!deletedLocation) {
    return next(new AppError("Location not found", 404));
  }

  res.status(200).json({
    success: true,
    message: "Location deleted successfully",
    data: deletedLocation,
  });
});

/**
 * PUT /api/admin/locations/:id/approve
 * Approve location (Admin only)
 */
exports.approveLocation = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const approvedLocation = await adminService.approveLocation(id);

  if (!approvedLocation) {
    return next(new AppError("Location not found", 404));
  }

  res.status(200).json({
    success: true,
    message: "Location approved successfully",
    data: approvedLocation,
  });
});

/**
 * PUT /api/admin/locations/:id/reject
 * Reject location (Admin only)
 */
exports.rejectLocation = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const rejectedLocation = await adminService.rejectLocation(id);

  if (!rejectedLocation) {
    return next(new AppError("Location not found", 404));
  }

  res.status(200).json({
    success: true,
    message: "Location rejected successfully",
    data: rejectedLocation,
  });
});
