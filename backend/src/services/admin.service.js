const User = require("../models/user.model");
const Location = require("../models/location.model");

/* =====================================
   ANALYTICS SERVICE
===================================== */

/**
 * Get dashboard analytics stats
 * @param {String} days - "7" or "30" (default: "7")
 * @returns {Object} - {totalUsers, onlineUsers, newUsers}
 */
exports.getAnalyticsStats = async (days = 7) => {
  const daysAgo = new Date();
  daysAgo.setDate(daysAgo.getDate() - parseInt(days));

  try {
    // Total users
    const totalUsers = await User.countDocuments({
      role: "user",
      isEmailVerified: true,
    });

    // Online users (lastLogin trong 5 phút gần đây)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const onlineUsers = await User.countDocuments({
      role: "user",
      lastLogin: { $gte: fiveMinutesAgo },
      status: "active",
    });

    // New registrations (last X days)
    const newUsers = await User.countDocuments({
      role: "user",
      createdAt: { $gte: daysAgo },
      isEmailVerified: true,
    });

    return {
      totalUsers,
      onlineUsers,
      newUsers,
    };
  } catch (error) {
    console.error("Error in getAnalyticsStats:", error);
    throw error;
  }
};

/**
 * Get user growth data for the past 7 days (Mon-Sun)
 * @returns {Array} - [{label: "Mon", value: 120}, ...]
 */
exports.getUserGrowth = async () => {
  try {
    const days = [];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // Get data for past 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const count = await User.countDocuments({
        role: "user",
        createdAt: { $gte: date, $lt: nextDate },
        isEmailVerified: true,
      });

      days.push({
        label: dayNames[date.getDay()],
        value: count,
      });
    }

    return days;
  } catch (error) {
    console.error("Error in getUserGrowth:", error);
    throw error;
  }
};

/**
 * Get top regions with most active users
 * @param {Number} limit - Number of regions to return (default: 4)
 * @returns {Array} - [{name: "Ho Chi Minh City", count: 4200}, ...]
 */
exports.getTopRegions = async (limit = 4) => {
  try {
    const regions = await User.aggregate([
      {
        $match: {
          role: "user",
          region: { $exists: true, $ne: null },
          status: "active",
        },
      },
      {
        $group: {
          _id: "$region",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: limit,
      },
      {
        $project: {
          _id: 0,
          name: "$_id",
          count: 1,
        },
      },
    ]);

    return regions;
  } catch (error) {
    console.error("Error in getTopRegions:", error);
    throw error;
  }
};

/* =====================================
   LOCATION SERVICE
===================================== */

/**
 * Get all locations (for MapManagement)
 * @param {Object} filter - Optional filter {status, createdBy}
 * @returns {Array} - List of locations
 */
exports.getAllLocations = async (filter = {}) => {
  try {
    const locations = await Location.find(filter)
      .populate("createdBy", "fullname avatar email")
      .sort({ createdAt: -1 });

    return locations;
  } catch (error) {
    console.error("Error in getAllLocations:", error);
    throw error;
  }
};

/**
 * Get location by ID
 * @param {String} locationId
 * @returns {Object} - Location document
 */
exports.getLocationById = async (locationId) => {
  try {
    const location = await Location.findById(locationId).populate(
      "createdBy",
      "fullname avatar email"
    );

    if (!location) {
      throw new Error("Location not found");
    }

    return location;
  } catch (error) {
    console.error("Error in getLocationById:", error);
    throw error;
  }
};

/**
 * Create new location
 * @param {Object} locationData - {name, address, latitude, longitude, description, image}
 * @param {String} userId - User creating the location
 * @returns {Object} - Created location document
 */
exports.createLocation = async (locationData, userId) => {
  try {
    const newLocation = new Location({
      name: locationData.name,
      address: locationData.address,
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      description: locationData.description || null,
      image: locationData.image || null,
      status: "pending", // Default to pending, admin approves later
      createdBy: userId,
    });

    await newLocation.save();
    return newLocation;
  } catch (error) {
    console.error("Error in createLocation:", error);
    throw error;
  }
};

/**
 * Update location
 * @param {String} locationId
 * @param {Object} updateData - Fields to update
 * @returns {Object} - Updated location document
 */
exports.updateLocation = async (locationId, updateData) => {
  try {
    const location = await Location.findByIdAndUpdate(locationId, updateData, {
      new: true,
    }).populate("createdBy", "fullname avatar email");

    if (!location) {
      throw new Error("Location not found");
    }

    return location;
  } catch (error) {
    console.error("Error in updateLocation:", error);
    throw error;
  }
};

/**
 * Delete location
 * @param {String} locationId
 * @returns {Object} - Deleted location document
 */
exports.deleteLocation = async (locationId) => {
  try {
    const location = await Location.findByIdAndDelete(locationId);

    if (!location) {
      throw new Error("Location not found");
    }

    return location;
  } catch (error) {
    console.error("Error in deleteLocation:", error);
    throw error;
  }
};

/**
 * Approve location (Admin only)
 * @param {String} locationId
 * @returns {Object} - Updated location document
 */
exports.approveLocation = async (locationId) => {
  try {
    const location = await Location.findByIdAndUpdate(
      locationId,
      { status: "active" },
      { new: true }
    ).populate("createdBy", "fullname avatar email");

    if (!location) {
      throw new Error("Location not found");
    }

    return location;
  } catch (error) {
    console.error("Error in approveLocation:", error);
    throw error;
  }
};

/**
 * Reject location (Admin only)
 * @param {String} locationId
 * @returns {Object} - Updated location document
 */
exports.rejectLocation = async (locationId) => {
  try {
    const location = await Location.findByIdAndUpdate(
      locationId,
      { status: "inactive" },
      { new: true }
    ).populate("createdBy", "fullname avatar email");

    if (!location) {
      throw new Error("Location not found");
    }

    return location;
  } catch (error) {
    console.error("Error in rejectLocation:", error);
    throw error;
  }
};
