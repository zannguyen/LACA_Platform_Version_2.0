const mongoose = require("mongoose");
const Report = require("../models/report.model");
const Post = require("../models/post.model"); // đảm bảo đúng path của bạn
const AppError = require("../utils/appError");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

exports.createReport = async ({
  reporterId,
  targetId,
  targetType,
  reason,
  category = "other",
  description = "",
}) => {
  if (!reporterId) throw new AppError("Unauthorized", 401);
  if (!isValidId(targetId)) throw new AppError("Invalid targetId", 400);

  if (!["post", "user", "place"].includes(targetType)) {
    throw new AppError("Invalid targetType", 400);
  }

  const reasonTrim = String(reason || "").trim();
  if (reasonTrim.length < 5 || reasonTrim.length > 500) {
    throw new AppError("Reason must be 5-500 characters", 400);
  }

  const descTrim = String(description || "").trim();
  if (descTrim.length > 1000) {
    throw new AppError("Description max 1000 characters", 400);
  }

  // chống spam: 1 user report cùng 1 target (pending) chỉ 1 lần
  const existed = await Report.findOne({
    reporterId,
    targetId,
    targetType,
    status: "pending",
  }).lean();
  if (existed) throw new AppError("You already reported this content", 409);

  // optional check tồn tại post
  if (targetType === "post") {
    const ok = await Post.exists({ _id: targetId });
    if (!ok) throw new AppError("Post not found", 404);
  }

  const doc = await Report.create({
    reporterId,
    targetId,
    targetType,
    reason: reasonTrim,
    category,
    description: descTrim,
    status: "pending",
    actionTaken: "none",
    createdAt: new Date(),
  });

  // optional: tăng reportCount cho post
  if (targetType === "post") {
    await Post.updateOne({ _id: targetId }, { $inc: { reportCount: 1 } });
  }

  return doc;
};
