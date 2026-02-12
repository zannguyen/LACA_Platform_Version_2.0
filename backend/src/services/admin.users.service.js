const mongoose = require("mongoose");
const User = require("../models/user.model");
const { computeUserStatus } = require("../utils/userStatus");

const toObjectId = (id) => {
  try {
    return new mongoose.Types.ObjectId(String(id));
  } catch {
    return null;
  }
};

const pickUser = (u) => ({
  id: String(u._id),
  fullname: u.fullname || "",
  username: u.username || "",
  email: u.email || "",
  isActive: !!u.isActive,
  isEmailVerified: !!u.isEmailVerified,
  deletedAt: u.deletedAt || null,
  suspendUntil: u.suspendUntil || null,
  role: u.role || "user",
  createdAt: u.createdAt,
  status: computeUserStatus(u),
});

/**
 * GET /api/admin/users?query=&status=&page=&limit=
 * status: all | active | blocked | unverified | deleted | suspended
 */
exports.listUsers = async (query) => {
  const q = (query.query || "").trim();
  const status = (query.status || "all").toLowerCase();
  const page = Math.max(parseInt(query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(query.limit || "10", 10), 1), 50);
  const skip = (page - 1) * limit;

  const filter = {};
  const now = new Date();

  // search theo fullname/username/email
  if (q) {
    filter.$or = [
      { fullname: { $regex: q, $options: "i" } },
      { username: { $regex: q, $options: "i" } },
      { email: { $regex: q, $options: "i" } },
    ];
  }

  // Filter theo status chuẩn 5 trạng thái
  if (status === "blocked" || status === "banned") {
    filter.deletedAt = null;
    filter.isActive = false;
  } else if (status === "unverified") {
    filter.deletedAt = null;
    filter.isActive = true;
    filter.isEmailVerified = false;
  } else if (status === "deleted") {
    filter.deletedAt = { $ne: null };
  } else if (status === "suspended") {
    filter.deletedAt = null;
    filter.suspendUntil = { $gt: now };
  } else if (status === "active") {
    // active = không deleted, không suspended, active=true, verified=true
    filter.deletedAt = null;
    filter.isActive = true;
    filter.isEmailVerified = true;
    filter.$or = filter.$or; // giữ search nếu có
    filter.$and = [
      { $or: [{ suspendUntil: null }, { suspendUntil: { $lte: now } }] },
    ];
  } // status=all => không add gì thêm

  const selectFields =
    "fullname username email isActive isEmailVerified deletedAt suspendUntil role createdAt updatedAt";

  const [total, users] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select(selectFields)
      .lean(),
  ]);

  return {
    users: users.map((u) => pickUser(u)),
    total,
    page,
    limit,
  };
};

exports.getUserById = async (userId) => {
  const oid = toObjectId(userId);
  if (!oid) throw { status: 400, message: "Invalid userId" };

  const user = await User.findById(oid)
    .select(
      "fullname username email isActive isEmailVerified deletedAt suspendUntil role createdAt updatedAt",
    )
    .lean();

  if (!user) throw { status: 404, message: "User not found" };

  return { user: pickUser(user), updatedAt: user.updatedAt };
};

/**
 * PATCH /api/admin/users/:userId/status
 * body: { isActive: boolean }
 * => dùng cho blocked/unblocked
 */
exports.updateUserStatus = async (userId, body) => {
  const oid = toObjectId(userId);
  if (!oid) throw { status: 400, message: "Invalid userId" };

  if (typeof body.isActive !== "boolean") {
    throw { status: 400, message: "Body must include boolean isActive" };
  }

  const user = await User.findByIdAndUpdate(
    oid,
    { isActive: body.isActive },
    { new: true },
  )
    .select(
      "fullname username email isActive isEmailVerified deletedAt suspendUntil role createdAt",
    )
    .lean();

  if (!user) throw { status: 404, message: "User not found" };

  return { success: true, user: pickUser(user) };
};

/**
 * PATCH /api/admin/users/:userId
 * body: { fullname?, username?, email?, role?, isEmailVerified? }
 */
exports.updateUser = async (userId, body) => {
  const oid = toObjectId(userId);
  if (!oid) throw { status: 400, message: "Invalid userId" };

  const allowed = {};
  if (typeof body.fullname === "string")
    allowed.fullname = body.fullname.trim();
  if (typeof body.username === "string")
    allowed.username = body.username.trim();
  if (typeof body.email === "string")
    allowed.email = body.email.trim().toLowerCase();
  if (typeof body.role === "string") allowed.role = body.role;
  if (typeof body.isEmailVerified === "boolean")
    allowed.isEmailVerified = body.isEmailVerified;

  if (Object.keys(allowed).length === 0) {
    throw { status: 400, message: "No valid fields to update" };
  }

  const user = await User.findByIdAndUpdate(oid, allowed, { new: true })
    .select(
      "fullname username email isActive isEmailVerified deletedAt suspendUntil role createdAt",
    )
    .lean();

  if (!user) throw { status: 404, message: "User not found" };

  return { success: true, user: pickUser(user) };
};

/**
 * PATCH /api/admin/users/:userId/suspend
 * body: { suspendUntil: ISO string | null }
 * - null => unsuspend
 */
exports.setSuspendUntil = async (userId, body) => {
  const oid = toObjectId(userId);
  if (!oid) throw { status: 400, message: "Invalid userId" };

  let value = null;

  if (body?.suspendUntil) {
    const d = new Date(body.suspendUntil);
    if (Number.isNaN(d.getTime())) {
      throw { status: 400, message: "Invalid suspendUntil" };
    }
    value = d;
  }

  const user = await User.findByIdAndUpdate(
    oid,
    { suspendUntil: value },
    { new: true },
  )
    .select(
      "fullname username email isActive isEmailVerified deletedAt suspendUntil role createdAt",
    )
    .lean();

  if (!user) throw { status: 404, message: "User not found" };

  return { success: true, user: pickUser(user) };
};

/**
 * PATCH /api/admin/users/:userId/delete
 * body: { deleted: boolean }
 * - deleted=true => soft delete (deletedAt=now)
 * - deleted=false => restore (deletedAt=null)
 */
exports.setDeleted = async (userId, body) => {
  const oid = toObjectId(userId);
  if (!oid) throw { status: 400, message: "Invalid userId" };

  if (typeof body?.deleted !== "boolean") {
    throw { status: 400, message: "Body must include boolean deleted" };
  }

  const user = await User.findByIdAndUpdate(
    oid,
    { deletedAt: body.deleted ? new Date() : null },
    { new: true },
  )
    .select(
      "fullname username email isActive isEmailVerified deletedAt suspendUntil role createdAt",
    )
    .lean();

  if (!user) throw { status: 404, message: "User not found" };

  return { success: true, user: pickUser(user) };
};

/**
 * ❗️Không xóa cứng nữa. Đổi deleteUser thành soft delete.
 * DELETE /api/admin/users/:userId  => set deletedAt
 */
exports.deleteUser = async (userId) => {
  const oid = toObjectId(userId);
  if (!oid) throw { status: 400, message: "Invalid userId" };

  const user = await User.findByIdAndUpdate(
    oid,
    {
      deletedAt: new Date(),
      isActive: false, // deleted thì khóa luôn
    },
    { new: true },
  )
    .select(
      "fullname username email isActive isEmailVerified deletedAt suspendUntil role createdAt",
    )
    .lean();

  if (!user) throw { status: 404, message: "User not found" };
  return { success: true, user: pickUser(user) };
};

// ✅ restore user (bỏ deletedAt)
exports.restoreUser = async (userId) => {
  const oid = toObjectId(userId);
  if (!oid) throw { status: 400, message: "Invalid userId" };

  const user = await User.findByIdAndUpdate(
    oid,
    { deletedAt: null },
    { new: true },
  )
    .select(
      "fullname username email isActive isEmailVerified deletedAt suspendUntil role createdAt",
    )
    .lean();

  if (!user) throw { status: 404, message: "User not found" };
  return { success: true, user: pickUser(user) };
};
