const mongoose = require("mongoose");
const AppError = require("../utils/appError");

const User = require("../models/user.model");
const Post = require("../models/post.model");
const BlockUser = require("../models/blockUser.model");
const Follow = require("../models/follow.model");

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

  const isOwner = viewerId && String(viewerId) === String(targetId);

  const postFilter = { userId: targetId, status: "active" };

  const followersCountPromise = Follow.countDocuments({ followingUserId: targetId });
  const followingCountPromise = Follow.countDocuments({ followerUserId: targetId });
  const isFollowingPromise =
    viewerId && !isOwner
      ? Follow.exists({ followerUserId: viewerId, followingUserId: targetId })
      : Promise.resolve(false);

  const [totalPosts, posts, followersCount, followingCount, isFollowing] = await Promise.all([
    Post.countDocuments(postFilter),
    Post.find(postFilter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    followersCountPromise,
    followingCountPromise,
    isFollowingPromise,
  ]);

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
      followers: followersCount || 0,
      following: followingCount || 0,
    },
    relationship: {
      isOwner: Boolean(isOwner),
      isFollowing: Boolean(isFollowing),
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

// ===== Follow =====
async function getFollowingUserIds(userId) {
  const id = safeObjectId(userId);
  const rows = await Follow.find({ followerUserId: id })
    .select("followingUserId")
    .lean();
  return rows.map((r) => r.followingUserId);
}

/**
 * Users mà mình follow VÀ họ cũng follow mình (mutual follow).
 * Chỉ mutual follow mới được xem bài + vị trí ngoài 5km.
 */
async function getMutualFollowUserIds(userId) {
  const id = safeObjectId(userId);
  const [following, followers] = await Promise.all([
    Follow.find({ followerUserId: id }).select("followingUserId").lean(),
    Follow.find({ followingUserId: id }).select("followerUserId").lean(),
  ]);
  const followingSet = new Set(following.map((r) => String(r.followingUserId)));
  const mutual = followers
    .filter((r) => followingSet.has(String(r.followerUserId)))
    .map((r) => r.followerUserId);
  return mutual;
}

async function getFollowersCount(userId) {
  const id = safeObjectId(userId);
  return await Follow.countDocuments({ followingUserId: id });
}

async function getFollowingCount(userId) {
  const id = safeObjectId(userId);
  return await Follow.countDocuments({ followerUserId: id });
}

async function isFollowingUser(followerId, followingId) {
  const follower = safeObjectId(followerId);
  const following = safeObjectId(followingId);
  const exists = await Follow.exists({ followerUserId: follower, followingUserId: following });
  return Boolean(exists);
}

async function followUser(followerId, followingId) {
  const follower = safeObjectId(followerId);
  const following = safeObjectId(followingId);

  if (String(follower) === String(following)) {
    throw new AppError("You cannot follow yourself", 400);
  }

  const targetExists = await User.exists({ _id: following });
  if (!targetExists) throw new AppError("User not found", 404);

  // If either direction is blocked, forbid follow
  const blockedEitherWay = await BlockUser.exists({
    $or: [
      { blockerUserId: follower, blockedUserId: following },
      { blockerUserId: following, blockedUserId: follower },
    ],
  });
  if (blockedEitherWay) {
    throw new AppError("Cannot follow this user", 403);
  }

  try {
    await Follow.create({ followerUserId: follower, followingUserId: following });
  } catch (e) {
    // Duplicate follow -> ignore
    if (e?.code !== 11000) throw e;
  }

  return { isFollowing: true };
}

async function unfollowUser(followerId, followingId) {
  const follower = safeObjectId(followerId);
  const following = safeObjectId(followingId);

  await Follow.deleteOne({ followerUserId: follower, followingUserId: following });
  return { isFollowing: false };
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

  // follow
  getFollowingUserIds,
  getMutualFollowUserIds,
  getFollowersCount,
  getFollowingCount,
  isFollowingUser,
  followUser,
  unfollowUser,

  // block
  blockUser,
  unblockUser,
  getBlockedUsers,
  getBlockedUserIds,
  isBlocked,
};
