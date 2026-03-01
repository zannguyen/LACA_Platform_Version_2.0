// backend/src/services/admin.notification.service.js
const BroadcastHistory = require("../models/broadcastHistory.model");
const User = require("../models/user.model");
const notificationService = require("./notification.service");
const AppError = require("../utils/appError");

/**
 * Send broadcast notification to all active users
 */
exports.sendBroadcastToAll = async (io, { adminId, title, body, link }) => {
  try {
    // Create broadcast history record
    const broadcast = await BroadcastHistory.create({
      adminId,
      title,
      body,
      link,
      status: "pending",
    });

    // Fetch all active users (not deleted, not suspended, email verified, active)
    const activeUsers = await User.find({
      isActive: true,
      isEmailVerified: true,
      deletedAt: null,
      $or: [{ suspendUntil: null }, { suspendUntil: { $lt: new Date() } }],
    }).select("_id");

    const recipientIds = activeUsers.map((u) => u._id);

    // Update broadcast with recipient count
    broadcast.recipientCount = recipientIds.length;
    broadcast.status = "sending";
    await broadcast.save();

    // Send broadcast to all users
    if (recipientIds.length > 0) {
      await notificationService.systemBroadcast(io, {
        recipientIds,
        title,
        body,
        link,
        broadcastHistoryId: broadcast._id,
      });
    }

    // Update broadcast status to completed
    broadcast.status = "completed";
    broadcast.sentAt = new Date();
    broadcast.deliveredCount = recipientIds.length;
    await broadcast.save();

    return broadcast;
  } catch (error) {
    // Update broadcast status to failed
    if (broadcast) {
      broadcast.status = "failed";
      broadcast.errorMessage = error.message;
      await broadcast.save();
    }
    throw error;
  }
};

/**
 * Get broadcast history for admin
 */
exports.getBroadcastHistory = async (
  adminId,
  { page = 1, limit = 20, status = null },
) => {
  try {
    const query = { adminId };

    if (status && status !== "all") {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const [broadcasts, total] = await Promise.all([
      BroadcastHistory.find(query)
        .populate("adminId", "fullname username avatar")
        .sort({ sentAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      BroadcastHistory.countDocuments(query),
    ]);

    return {
      broadcasts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get single broadcast details
 */
exports.getBroadcastDetails = async (broadcastId, adminId) => {
  try {
    const broadcast = await BroadcastHistory.findOne({
      _id: broadcastId,
      adminId,
    }).populate("adminId", "fullname username avatar");

    if (!broadcast) {
      throw new AppError("Broadcast not found", 404);
    }

    return broadcast;
  } catch (error) {
    throw error;
  }
};

/**
 * Get all broadcasts (for super admin)
 */
exports.getAllBroadcasts = async ({ page = 1, limit = 20, status = null }) => {
  try {
    const query = {};

    if (status && status !== "all") {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const [broadcasts, total] = await Promise.all([
      BroadcastHistory.find(query)
        .populate("adminId", "fullname username avatar")
        .sort({ sentAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      BroadcastHistory.countDocuments(query),
    ]);

    return {
      broadcasts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    throw error;
  }
};
