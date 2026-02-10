const mongoose = require("mongoose");

const User = require("../models/user.model"); // dùng cho count (fallback sang db.collection nếu lệch)
const Place = require("../models/place.model");
const Post = require("../models/post.model");
const Report = require("../models/report.model");
const Checkin = require("../models/checkin.model");
const Feedback = require("../models/feedback.model"); // chưa dùng, giữ lại

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
      // pendingReviews = pending reports
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

  // 1) Load recent docs
  const [posts, checkins, reports] = await Promise.all([
    Post.find({}).sort({ createdAt: -1 }).limit(perType).lean(),

    Checkin.find({})
      .sort({ createdAt: -1 })
      .limit(perType)
      // ✅ user trong DB: fullname/username (không có name)
      .populate("userId", "fullname username avatar email")
      .populate("placeId", "name")
      .lean(),

    Report.find({})
      .sort({ createdAt: -1 })
      .limit(perType)
      // ✅ reporter cũng là user
      .populate("reporterId", "fullname username avatar email")
      .lean(),
  ]);

  const mapped = [];

  // 2) Map checkins
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

  // 3) Map reports
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

  // 4) Posts: join thủ công bằng DB collection "users" (không phụ thuộc User model)
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

  // 5) Sort desc and slice
  mapped.sort((a, b) => b.timestamp - a.timestamp);
  return { activities: mapped.slice(0, limit) };
};
