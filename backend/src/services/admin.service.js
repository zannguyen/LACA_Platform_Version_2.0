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
      // ✅ FIXED: Match Analytics query logic (all-time, no date filter)
      User.countDocuments({
        role: "user",
        isEmailVerified: true,
      }).catch(async () =>
        mongoose.connection.db.collection("users").countDocuments({
          role: "user",
          isEmailVerified: true,
        }),
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

  // ✅ FIXED: totalUsers = ALL verified users (baseline)
  const totalUsers = await User.countDocuments({
    role: "user",
    isEmailVerified: true,
  });

  // ✅ FIXED: onlineUsers = VERIFIED + ACTIVE users (subset of totalUsers)
  const onlineUsers = await User.countDocuments({
    role: "user",
    isEmailVerified: true,
    isActive: true,
  });

  // ✅ newUsers = registered in the DATE RANGE
  const newUsers = await User.countDocuments({
    role: "user",
    createdAt: { $gte: daysAgo },
    isEmailVerified: true,
  });

  // ✅ NEW: newPlaces = locations created in the DATE RANGE
  const newPlaces = await Place.countDocuments({
    createdAt: { $gte: daysAgo },
  });

  return { totalUsers, onlineUsers, newUsers, newPlaces };
};

exports.getUserGrowth = async (days = "7") => {
  const n = parseInt(days, 10);
  const dayCount = n === 30 ? 29 : 6; // 30 days = 30 data points (0-29), 7 days = 7 (0-6)
  const chartData = [];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (let i = dayCount; i >= 0; i--) {
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

    // ✅ Format label based on days parameter
    const label = n === 30
      ? `${date.getMonth() + 1}/${date.getDate()}`
      : dayNames[date.getDay()];

    chartData.push({ label, value: count });
  }

  return chartData;
};

// ===============================
// HELPER: Extract city from address
// ===============================
const extractProvinceFromAddress = (address) => {
  if (!address || typeof address !== "string") return "Unknown";

  // Vietnamese provinces/states mapping (extract province level, not city)
  const provincePatterns = [
    // Special cities that are also provinces
    { pattern: /ho\s*chi\s*minh|tphcm|hcm/i, province: "Ho Chi Minh City" },
    { pattern: /ha\s*noi|hanoi/i, province: "Ha Noi" },
    { pattern: /da\s*nang|danang/i, province: "Da Nang" },
    { pattern: /can\s*tho|cantho/i, province: "Can Tho" },
    
    // Other major provinces
    { pattern: /hai\s*phong|haiphong/i, province: "Hai Phong" },
    { pattern: /nha\s*trang|khanh\s*hoa/i, province: "Khanh Hoa" },
    { pattern: /da\s*lat|lam\s*dong/i, province: "Lam Dong" },
    { pattern: /hue|thua\s*thien|thừa\s*thiên/i, province: "Thua Thien-Hue" },
    { pattern: /vung\s*tau|ba\s*ria/i, province: "Ba Ria - Vung Tau" },
    { pattern: /phu\s*quoc|kien\s*giang/i, province: "Kien Giang" },
    { pattern: /binh\s*duong/i, province: "Binh Duong" },
    { pattern: /dong\s*nai/i, province: "Dong Nai" },
    { pattern: /long\s*an/i, province: "Long An" },
    { pattern: /tien\s*giang/i, province: "Tien Giang" },
    { pattern: /ben\s*tre/i, province: "Ben Tre" },
    { pattern: /vinh\s*long/i, province: "Vinh Long" },
    { pattern: /an\s*giang/i, province: "An Giang" },
    { pattern: /dong\s*thap/i, province: "Dong Thap" },
    { pattern: /ca\s*mau/i, province: "Ca Mau" },
    { pattern: /bac\s*kan/i, province: "Bac Kan" },
    { pattern: /lang\s*son/i, province: "Lang Son" },
    { pattern: /cao\s*bang/i, province: "Cao Bang" },
    { pattern: /quang\s*ninh/i, province: "Quang Ninh" },
    { pattern: /thai\s*nguyen/i, province: "Thai Nguyen" },
    { pattern: /yen\s*bai/i, province: "Yen Bai" },
    { pattern: /son\s*la/i, province: "Son La" },
    { pattern: /dien\s*bien/i, province: "Dien Bien" },
    { pattern: /lao\s*cai/i, province: "Lao Cai" },
    { pattern: /ha\s*giang/i, province: "Ha Giang" },
    { pattern: /thanh\s*hoa/i, province: "Thanh Hoa" },
    { pattern: /nghe\s*an/i, province: "Nghe An" },
    { pattern: /ha\s*tinh/i, province: "Ha Tinh" },
    { pattern: /quang\s*binh/i, province: "Quang Binh" },
    { pattern: /quang\s*tri/i, province: "Quang Tri" },
    { pattern: /thua\s*thien/i, province: "Thua Thien-Hue" },
    { pattern: /quang\s*nam/i, province: "Quang Nam" },
    { pattern: /quang\s*ngai/i, province: "Quang Ngai" },
    { pattern: /binh\s*dinh/i, province: "Binh Dinh" },
    { pattern: /phu\s*yen/i, province: "Phu Yen" },
    { pattern: /ninh\s*thuan/i, province: "Ninh Thuan" },
    { pattern: /binh\s*thuan/i, province: "Binh Thuan" },
  ];

  for (const { pattern, province } of provincePatterns) {
    if (pattern.test(address)) {
      return province;
    }
  }

  // Fallback: extract from comma-separated parts
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : "Unknown";
};

// ===============================
// GET TOP REGIONS (from Places)
// ===============================
exports.getTopRegions = async (limit = 4, days = "7") => {
  const lim = Math.max(1, Math.min(Number(limit) || 4, 20));
  const n = parseInt(days, 10);
  const daysAgo = new Date();
  daysAgo.setDate(daysAgo.getDate() - (Number.isFinite(n) ? n : 7));

  try {
    // ✅ FIXED: Filter places by date range
    const places = await Place.find({
      isActive: true,
      createdAt: { $gte: daysAgo },
    })
      .select("address name")
      .lean();

    // Group places by province/region
    const regionMap = new Map();

    for (const place of places) {
      const province = extractProvinceFromAddress(place.address);
      const count = regionMap.get(province) || 0;
      regionMap.set(province, count + 1);
    }

    // Convert to array and sort by count
    const regions = Array.from(regionMap, ([name, count]) => ({
      name,
      count,
    }))
      .sort((a, b) => b.count - a.count)
      .slice(0, lim);

    return regions;
  } catch (err) {
    console.error("Error in getTopRegions:", err);
    return [];
  }
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

// ===============================
// DEBUG: Get places data with city extraction
// ===============================
exports.debugPlacesData = async (days = "7") => {
  const n = parseInt(days, 10);
  const daysAgo = new Date();
  daysAgo.setDate(daysAgo.getDate() - (Number.isFinite(n) ? n : 7));

  try {
    // Get ALL places (no filter) for comparison
    const allPlaces = await Place.find()
      .select("name address isActive createdAt")
      .lean();

    // Get active places within date range
    const filteredPlaces = await Place.find({
      isActive: true,
      createdAt: { $gte: daysAgo },
    })
      .select("name address isActive createdAt")
      .lean();

    // Process each place
    const processedPlaces = filteredPlaces.map((place) => ({
      name: place.name,
      address: place.address,
      isActive: place.isActive,
      createdAt: place.createdAt,
      extractedProvince: extractProvinceFromAddress(place.address),
      withinDateRange: place.createdAt >= daysAgo,
    }));

    // Group by extracted province
    const regionMap = new Map();
    for (const place of filteredPlaces) {
      const province = extractProvinceFromAddress(place.address);
      const count = regionMap.get(province) || 0;
      regionMap.set(province, count + 1);
    }

    const regions = Array.from(regionMap, ([name, count]) => ({
      name,
      count,
    }))
      .sort((a, b) => b.count - a.count);

    return {
      totalPlaces: allPlaces.length,
      filteredPlaces: filteredPlaces.length,
      dateRange: {
        from: daysAgo,
        to: new Date(),
        days: n,
      },
      processedPlaces,
      regions,
      debug: {
        allPlacesData: allPlaces,
      },
    };
  } catch (err) {
    console.error("Error in debugPlacesData:", err);
    return { error: err.message };
  }
};
