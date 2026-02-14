const mongoose = require("mongoose");

const User = require("../models/user.model");
const Place = require("../models/place.model");
const Post = require("../models/post.model");
const Report = require("../models/report.model");
const Checkin = require("../models/checkin.model");
const Feedback = require("../models/feedback.model"); // chưa dùng

const toTime = (d) => (d ? new Date(d).getTime() : Date.now());

const toObjectIdSafe = (v) => {
  try {
    if (!v) return null;
    return new mongoose.Types.ObjectId(String(v));
  } catch {
    return null;
  }
};

const uniqObjectIds = (arr) => {
  const seen = new Set();
  const out = [];
  for (const v of arr) {
    const oid = toObjectIdSafe(v);
    if (!oid) continue;
    const key = String(oid);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(oid);
  }
  return out;
};

const pickDisplayName = (u) => {
  if (!u) return "Unknown";
  return u.fullname || u.username || u.email || "Unknown";
};

// ===============================
// DASHBOARD
// ===============================
exports.getDashboardStats = async () => {
  const [totalUsers, activeLocations, totalPosts, pendingReviews] =
    await Promise.all([
      User.countDocuments().catch(async () =>
        mongoose.connection.db.collection("users").countDocuments(),
      ),
      Place.countDocuments({}).catch(async () =>
        mongoose.connection.db.collection("places").countDocuments(),
      ),
      Post.countDocuments().catch(async () =>
        mongoose.connection.db.collection("posts").countDocuments(),
      ),
      Report.countDocuments({ status: "pending" }).catch(async () =>
        mongoose.connection.db
          .collection("reports")
          .countDocuments({ status: "pending" }),
      ),
    ]);

  return { totalUsers, activeLocations, pendingReviews, totalPosts };
};

exports.getRecentActivities = async (limit = 5) => {
  const perType = Math.max(limit, 8);

  const [posts, checkins, reports] = await Promise.all([
    Post.find({}).sort({ createdAt: -1 }).limit(perType).lean(),

    Checkin.find({})
      .sort({ createdAt: -1 })
      .limit(perType)
      .populate("userId", "fullname username avatar email")
      .populate("placeId", "name")
      .lean(),

    Report.find({})
      .sort({ createdAt: -1 })
      .limit(perType)
      .populate("reporterId", "fullname username avatar email")
      .lean(),
  ]);

  const mapped = [];

  for (const c of checkins) {
    const u = c.userId && typeof c.userId === "object" ? c.userId : null;

    mapped.push({
      id: String(c._id),
      user: {
        id: u?._id ? String(u._id) : c.userId ? String(c.userId) : null,
        name: pickDisplayName(u),
        avatar: u?.avatar || null,
      },
      action: "created a new check-in",
      location: c.placeId?.name || "",
      timestamp: toTime(c.createdAt),
      type: "checkin",
    });
  }

  for (const r of reports) {
    const u =
      r.reporterId && typeof r.reporterId === "object" ? r.reporterId : null;

    mapped.push({
      id: String(r._id),
      user: {
        id: u?._id ? String(u._id) : r.reporterId ? String(r.reporterId) : null,
        name: pickDisplayName(u),
        avatar: u?.avatar || null,
      },
      action: "reported content",
      location: "",
      timestamp: toTime(r.createdAt),
      type: "report",
    });
  }

  if (posts.length) {
    const db = mongoose.connection.db;

    const userIds = uniqObjectIds(posts.map((p) => p.userId));
    const placeIds = uniqObjectIds(posts.map((p) => p.placeId));

    const [usersRaw, places] = await Promise.all([
      userIds.length
        ? db
            .collection("users")
            .find({ _id: { $in: userIds } })
            .project({ fullname: 1, username: 1, email: 1, avatar: 1 })
            .toArray()
        : Promise.resolve([]),

      placeIds.length
        ? Place.find({ _id: { $in: placeIds } })
            .select("name")
            .lean()
            .catch(async () =>
              db
                .collection("places")
                .find({ _id: { $in: placeIds } })
                .project({ name: 1 })
                .toArray(),
            )
        : Promise.resolve([]),
    ]);

    const userMap = new Map(usersRaw.map((u) => [String(u._id), u]));
    const placeMap = new Map(places.map((p) => [String(p._id), p]));

    for (const p of posts) {
      const uid = p.userId ? String(p.userId) : null;
      const pid = p.placeId ? String(p.placeId) : null;

      const u = uid ? userMap.get(uid) : null;
      const pl = pid ? placeMap.get(pid) : null;

      mapped.push({
        id: String(p._id),
        user: {
          id: uid,
          name: pickDisplayName(u),
          avatar: u?.avatar || null,
        },
        action: "created a new post",
        location: pl?.name || "",
        timestamp: toTime(p.createdAt),
        type: "post",
      });
    }
  }

  mapped.sort((a, b) => b.timestamp - a.timestamp);
  return { activities: mapped.slice(0, limit) };
};

// ===============================
// ANALYTICS
// ===============================
exports.getAnalyticsStats = async (days = "7") => {
  const n = parseInt(days, 10);
  const daysAgo = new Date();
  daysAgo.setDate(daysAgo.getDate() - (Number.isFinite(n) ? n : 7));

  const totalUsers = await User.countDocuments({
    role: "user",
    isEmailVerified: true,
  });

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const onlineUsers = await User.countDocuments({
    role: "user",
    lastLogin: { $gte: fiveMinutesAgo },
    status: "active",
  });

  const newUsers = await User.countDocuments({
    role: "user",
    createdAt: { $gte: daysAgo },
    isEmailVerified: true,
  });

  return { totalUsers, onlineUsers, newUsers };
};

exports.getUserGrowth = async () => {
  const days = [];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

    days.push({ label: dayNames[date.getDay()], value: count });
  }

  return days;
};

exports.getTopRegions = async (limit = 4) => {
  const lim = Math.max(1, Math.min(Number(limit) || 4, 20));

  return User.aggregate([
    {
      $match: {
        role: "user",
        region: { $exists: true, $ne: null },
        status: "active",
      },
    },
    { $group: { _id: "$region", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: lim },
    { $project: { _id: 0, name: "$_id", count: 1 } },
  ]);
};

// ===============================
// LOCATIONS (Place)
// ===============================
function parseLatLng(input = {}) {
  const lat =
    input.lat !== undefined
      ? Number(input.lat)
      : input.latitude !== undefined
        ? Number(input.latitude)
        : undefined;

  const lng =
    input.lng !== undefined
      ? Number(input.lng)
      : input.longitude !== undefined
        ? Number(input.longitude)
        : undefined;

  return { lat, lng };
}

function assertValidLatLng(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    const e = new Error("Invalid latitude or longitude");
    e.statusCode = 400;
    throw e;
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    const e = new Error("Invalid latitude or longitude");
    e.statusCode = 400;
    throw e;
  }
}

function buildPlaceUpdate(body = {}) {
  const update = {};

  if (body.googlePlaceId !== undefined) {
    update.googlePlaceId = body.googlePlaceId
      ? String(body.googlePlaceId).trim()
      : undefined;
  }
  if (body.name !== undefined) update.name = String(body.name).trim();
  if (body.address !== undefined) update.address = String(body.address).trim();
  if (body.category !== undefined) update.category = body.category;
  if (body.isActive !== undefined) update.isActive = Boolean(body.isActive);

  const { lat, lng } = parseLatLng(body);
  if (lat !== undefined || lng !== undefined) {
    assertValidLatLng(lat, lng);
    update.location = { type: "Point", coordinates: [lng, lat] };
  }

  return update;
}

exports.getAllLocations = async (filter = {}) => {
  const q = {};
  if (filter.isActive !== undefined) q.isActive = filter.isActive;

  return Place.find(q)
    .select(
      "googlePlaceId name address category location isActive createdAt updatedAt",
    )
    .sort({ createdAt: -1 })
    .lean();
};

exports.getLocationById = async (placeId) => {
  return Place.findById(placeId)
    .select(
      "googlePlaceId name address category location isActive createdAt updatedAt",
    )
    .lean();
};

exports.createLocation = async (locationData) => {
  const name = locationData?.name ? String(locationData.name).trim() : "";
  const address = locationData?.address
    ? String(locationData.address).trim()
    : "";
  const { lat, lng } = parseLatLng(locationData);

  if (!name || !address || lat === undefined || lng === undefined) {
    const e = new Error("Please provide name, address, latitude/longitude");
    e.statusCode = 400;
    throw e;
  }

  assertValidLatLng(lat, lng);

  return Place.create({
    googlePlaceId: locationData.googlePlaceId
      ? String(locationData.googlePlaceId).trim()
      : undefined,
    name,
    address,
    category: locationData.category || "other",
    location: { type: "Point", coordinates: [lng, lat] },
    isActive:
      locationData.isActive !== undefined
        ? Boolean(locationData.isActive)
        : true,
  });
};

exports.updateLocation = async (placeId, updateData) => {
  const update = buildPlaceUpdate(updateData);

  return Place.findByIdAndUpdate(placeId, update, {
    new: true,
    runValidators: true,
  })
    .select(
      "googlePlaceId name address category location isActive createdAt updatedAt",
    )
    .lean();
};

exports.deleteLocation = async (placeId) => {
  return Place.findByIdAndDelete(placeId).lean();
};

exports.approveLocation = async (placeId) => {
  return Place.findByIdAndUpdate(
    placeId,
    { isActive: true },
    { new: true, runValidators: true },
  )
    .select(
      "googlePlaceId name address category location isActive createdAt updatedAt",
    )
    .lean();
};

exports.rejectLocation = async (placeId) => {
  return Place.findByIdAndUpdate(
    placeId,
    { isActive: false },
    { new: true, runValidators: true },
  )
    .select(
      "googlePlaceId name address category location isActive createdAt updatedAt",
    )
    .lean();
};
