const mongoose = require("mongoose");
const Report = require("../models/report.model");
const Post = require("../models/post.model");
const AppError = require("../utils/appError");

// Nếu bạn có User model và muốn ban user thật sự:
// const User = require("../models/user.model");

let Place = null;
try {
  Place = require("../models/place.model");
} catch {
  // không có place.model.js thì bỏ qua
}

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const VALID_STATUS = ["pending", "reviewed", "dismissed"];
const VALID_TARGET = ["post", "user", "place"];
const VALID_CATEGORY = [
  "spam",
  "harassment",
  "inappropriate",
  "false_info",
  "other",
];
const VALID_ACTION = [
  "none",
  "warned",
  "post_hidden",
  "post_deleted",
  "user_banned",
  "place_hidden",
];

function getPlacePathFromPostModel() {
  // auto-detect field name: placeId OR place
  if (Post?.schema?.path?.("placeId")) return "placeId";
  if (Post?.schema?.path?.("place")) return "place";
  return null;
}

function normalizePostPlace(postDoc) {
  if (!postDoc) return null;
  const placePath = getPlacePathFromPostModel();
  if (!placePath) return postDoc;
  const place = postDoc[placePath] || null;
  const out = { ...postDoc, place };
  delete out[placePath];
  return out;
}

exports.listReports = async ({
  status,
  targetType,
  category,
  q,
  page,
  limit,
}) => {
  if (status && !VALID_STATUS.includes(status))
    throw new AppError("Invalid status", 400);
  if (targetType && !VALID_TARGET.includes(targetType))
    throw new AppError("Invalid targetType", 400);
  if (category && !VALID_CATEGORY.includes(category))
    throw new AppError("Invalid category", 400);

  const filter = {};
  if (status) filter.status = status;
  if (targetType) filter.targetType = targetType;
  if (category) filter.category = category;
  if (q) {
    filter.$or = [
      { reason: { $regex: q, $options: "i" } },
      { description: { $regex: q, $options: "i" } },
    ];
  }

  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const safeLimit =
    Number.isFinite(limit) && limit > 0 ? Math.min(limit, 50) : 20;
  const skip = (safePage - 1) * safeLimit;

  const [reports, total] = await Promise.all([
    Report.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .populate("reporterId", "username fullname email avatar")
      .lean(),
    Report.countDocuments(filter),
  ]);

  const postIds = reports
    .filter((r) => r.targetType === "post")
    .map((r) => r.targetId)
    .filter(Boolean);

  const placePath = getPlacePathFromPostModel();

  const postQuery = Post.find({ _id: { $in: postIds } })
    .select("_id userId mediaUrl content type status reportCount createdAt")
    .populate("userId", "username fullname email avatar");

  if (placePath) {
    postQuery.select(`${placePath}`);
    postQuery.populate(placePath, "location name");
  }

  const posts = postIds.length ? await postQuery.lean() : [];
  const postMap = new Map(
    posts.map((p) => [String(p._id), normalizePostPlace(p)]),
  );

  const items = reports.map((r) => {
    const out = { ...r };
    out.reporter = r.reporterId || null;
    delete out.reporterId;

    if (r.targetType === "post") {
      const p = postMap.get(String(r.targetId)) || null;
      out.post = p;
      out.owner = p?.userId || null;
    }

    return out;
  });

  return { items, total, page: safePage, limit: safeLimit };
};

exports.getReport = async (reportId) => {
  if (!isValidId(reportId)) throw new AppError("Invalid reportId", 400);

  const r = await Report.findById(reportId)
    .populate("reporterId", "username fullname email avatar")
    .lean();

  if (!r) throw new AppError("Report not found", 404);

  const out = { ...r, reporter: r.reporterId || null };
  delete out.reporterId;

  if (r.targetType === "post") {
    const placePath = getPlacePathFromPostModel();
    const postQuery = Post.findById(r.targetId)
      .select("_id userId mediaUrl content type status reportCount createdAt")
      .populate("userId", "username fullname email avatar");

    if (placePath) {
      postQuery.select(`${placePath}`);
      postQuery.populate(placePath, "location name");
    }

    const p = await postQuery.lean();
    out.post = normalizePostPlace(p);
    out.owner = out.post?.userId || null;
  }

  return out;
};

exports.handleReport = async ({
  reportId,
  adminId,
  status,
  actionTaken,
  note,
}) => {
  if (!isValidId(reportId)) throw new AppError("Invalid reportId", 400);
  if (!adminId) throw new AppError("Unauthorized", 401);

  if (status && !VALID_STATUS.includes(status))
    throw new AppError("Invalid status", 400);
  if (actionTaken && !VALID_ACTION.includes(actionTaken))
    throw new AppError("Invalid actionTaken", 400);

  const report = await Report.findById(reportId);
  if (!report) throw new AppError("Report not found", 404);

  const act = actionTaken || "none";

  // action cho post
  if (report.targetType === "post") {
    if (act === "post_hidden") {
      await Post.updateOne(
        { _id: report.targetId },
        { $set: { status: "hidden" } },
      );
    }
    if (act === "post_deleted") {
      await Post.deleteOne({ _id: report.targetId });
    }
    // user_banned: tuỳ schema User của bạn => bạn tự nối thêm
  }

  // action cho place nếu có model
  if (report.targetType === "place") {
    if (act === "place_hidden" && Place) {
      await Place.updateOne(
        { _id: report.targetId },
        { $set: { status: "hidden" } },
      );
    }
  }

  report.status = status || "reviewed";
  report.actionTaken = act;
  report.note = String(note || "").slice(0, 500);
  report.handledBy = adminId;
  report.handledAt = new Date();
  await report.save();

  return report;
};
