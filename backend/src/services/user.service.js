const mongoose = require("mongoose");
const AppError = require("../utils/appError");
const User = require("../models/user.model");
const Post = require("../models/post.model");

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

/**
 * Lấy profile (public) của 1 user + danh sách posts.
 * - Nếu viewerId === targetId => có thể trả thêm email (tùy bạn).
 */
exports.getProfile = async ({ targetUserId, viewerUserId, query }) => {
  const targetId = safeObjectId(targetUserId);
  const viewerId = viewerUserId ? safeObjectId(viewerUserId) : null;

  const user = await User.findById(targetId).lean();
  if (!user) throw new AppError("User not found", 404);

  const { page, limit, skip } = parsePagination(query);

  // profile: posts của user đó
  const postFilter = { userId: targetId, status: "active" };

  const [totalPosts, posts] = await Promise.all([
    Post.countDocuments(postFilter),
    Post.find(postFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const isOwner = viewerId && String(viewerId) === String(targetId);

  // Public payload: không trả password
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
      // followers/friends: chưa implement ở backend hiện tại
      followers: 0,
    },
    posts,
    pagination: {
      page,
      limit,
      total: totalPosts,
      totalPages: Math.ceil(totalPosts / limit) || 1,
    },
  };
};

/**
 * Update profile của chính mình
 * Chỉ cho phép update các field profile (fullname, bio/note, avatar).
 */
exports.updateMyProfile = async ({ userId, body }) => {
  const id = safeObjectId(userId);

  const update = {};
  if (typeof body.fullname === "string") update.fullname = body.fullname.trim();
  // frontend gọi "bio";  cũng nói "note" => support cả 2
  if (typeof body.bio === "string") update.bio = body.bio.trim();
  if (typeof body.note === "string") update.bio = body.note.trim();
  if (typeof body.avatar === "string") update.avatar = body.avatar.trim();

  if (Object.keys(update).length === 0) {
    throw new AppError("Nothing to update", 400);
  }

  if (update.fullname && update.fullname.length > 120) {
    throw new AppError("fullname is too long", 400);
  }
  if (update.bio && update.bio.length > 200) {
    throw new AppError("bio/note is too long", 400);
  }

  // dùng findByIdAndUpdate (model của bạn có thể đang override) => luôn truyền {new:true}
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
};
