const mongoose = require("mongoose");
const AppError = require("../utils/appError");

const User = require("../models/user.model");
const Post = require("../models/post.model");
const BlockUser = require("../models/blockUser.model");

// ===== Helpers =====
function parsePagination(query) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function safeObjectId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid userId", 400);
  }
  return new mongoose.Types.ObjectId(id);
}

// ===== Profile =====
async function getProfile({ targetUserId, viewerUserId, query }) {
  const targetId = safeObjectId(targetUserId);
  const viewerId = viewerUserId ? safeObjectId(viewerUserId) : null;

  const user = await User.findById(targetId).lean();
  if (!user) throw new AppError("User not found", 404);

  const { page, limit, skip } = parsePagination(query);

  const postFilter = { userId: targetId, status: "active" };
  const [totalPosts, posts] = await Promise.all([
    Post.countDocuments(postFilter),
    Post.find(postFilter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
  ]);

  const isOwner = viewerId && String(viewerId) === String(targetId);

  const profileUser = {
    _id: user._id,
    fullname: user.fullname,
    username: user.username,
    avatar: user.avatar || "",
    bio: user.bio || "",
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  if (isOwner) {
    profileUser.email = user.email;
    profileUser.isEmailVerified = user.isEmailVerified;
  }

  return {
    user: profileUser,
    stats: {
      posts: totalPosts,
      followers: 0, // chưa implement
    },
    posts,
    pagination: {
      page,
      limit,
      total: totalPosts,
      totalPages: Math.ceil(totalPosts / limit) || 1,
    },
  };
}

async function updateMyProfile({ userId, body }) {
  const id = safeObjectId(userId);

  const update = {};
  if (typeof body.fullname === "string") update.fullname = body.fullname.trim();
  if (typeof body.bio === "string") update.bio = body.bio.trim();
  if (typeof body.note === "string") update.bio = body.note.trim();
  if (typeof body.avatar === "string") update.avatar = body.avatar.trim();

  if (Object.keys(update).length === 0) throw new AppError("Nothing to update", 400);
  if (update.fullname && update.fullname.length > 120) throw new AppError("fullname is too long", 400);
  if (update.bio && update.bio.length > 200) throw new AppError("bio/note is too long", 400);

  const updated = await User.findByIdAndUpdate(id, update, { new: true });
  if (!updated) throw new AppError("User not found", 404);

  return {
    _id: updated._id,
    fullname: updated.fullname,
    username: updated.username,
    email: updated.email,
    avatar: updated.avatar || "",
    bio: updated.bio || "",
    isEmailVerified: updated.isEmailVerified,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  };
}

// ===== Block / Unblock =====
async function getBlockedUsers(userId) {
  return await BlockUser.find({ blockerUserId: userId }).select("blockedUserId");
}

async function getBlockedUserIds(userId) {
  const blocked = await BlockUser.find({ blockerUserId: userId }).select("blockedUserId").lean();
  return blocked.map((entry) => entry.blockedUserId);
}

async function isBlocked(blockerId, blockedId) {
  const exists = await BlockUser.exists({
    blockerUserId: blockerId,
    blockedUserId: blockedId,
  });
  return Boolean(exists);
}

async function blockUser(blockerId, blockedId) {
  if (
    (await getBlockedUsers(blockerId)).some(
      (entry) => entry.blockedUserId.toString() === blockedId
    )
  ) {
    throw new AppError("User is already blocked", 400);
  }
  if (blockerId === blockedId) {
    throw new AppError("You cannot block yourself", 400);
  }
  if (!(await User.findById(blockedId))) {
    throw new AppError("User to be blocked does not exist", 404);
  }

  const blockEntry = new BlockUser({
    blockerUserId: blockerId,
    blockedUserId: blockedId,
  });
  await blockEntry.save();
}

async function unblockUser(blockerId, blockedId) {
  if (!(await User.findById(blockedId))) {
    throw new AppError("User to be unblocked does not exist", 404);
  }
  const blockEntry = await BlockUser.findOne({
    blockerUserId: blockerId,
    blockedUserId: blockedId,
  });
  if (!blockEntry) {
    throw new AppError("Block entry not found", 404);
  }
  await blockEntry.remove();
}

module.exports = {
  // profile
  getProfile,
  updateMyProfile,

  // block
  blockUser,
  unblockUser,
  getBlockedUsers,
  getBlockedUserIds,
  isBlocked,
};
