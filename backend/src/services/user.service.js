const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const AppError = require("../utils/appError");

const User = require("../models/user.model");
const Post = require("../models/post.model");
const BlockUser = require("../models/blockUser.model");
const Follow = require("../models/follow.model");

const PASSWORD_LENGTH_MIN = Number(process.env.PASSWORD_LENGTH_MIN || 6);
const PASSWORD_LENGTH_MAX = Number(process.env.PASSWORD_LENGTH_MAX || 50);
const SALT_ROUNDS = Number(process.env.SALT_ROUNDS || 10);

const DEFAULT_VISIBILITY = {
  fullname: true,
  avatar: true,
  bio: true,
  email: false,
  phoneNumber: false,
  dateOfBirth: false,
};

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

function normalizeVisibility(raw = {}) {
  const src = raw && typeof raw === "object" ? raw : {};
  return {
    fullname:
      typeof src.fullname === "boolean"
        ? src.fullname
        : DEFAULT_VISIBILITY.fullname,
    avatar:
      typeof src.avatar === "boolean" ? src.avatar : DEFAULT_VISIBILITY.avatar,
    bio: typeof src.bio === "boolean" ? src.bio : DEFAULT_VISIBILITY.bio,
    email:
      typeof src.email === "boolean" ? src.email : DEFAULT_VISIBILITY.email,
    phoneNumber:
      typeof src.phoneNumber === "boolean"
        ? src.phoneNumber
        : DEFAULT_VISIBILITY.phoneNumber,
    dateOfBirth:
      typeof src.dateOfBirth === "boolean"
        ? src.dateOfBirth
        : DEFAULT_VISIBILITY.dateOfBirth,
  };
}

function toPublicUser(user, isOwner = false) {
  const visibility = normalizeVisibility(user?.profileVisibility);

  const profileUser = {
    _id: user._id,
    username: user.username,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  if (isOwner || visibility.fullname) profileUser.fullname = user.fullname;
  if (isOwner || visibility.avatar) profileUser.avatar = user.avatar || "";
  if (isOwner || visibility.bio) profileUser.bio = user.bio || "";
  if (isOwner || visibility.email) profileUser.email = user.email;
  if (isOwner || visibility.phoneNumber)
    profileUser.phoneNumber = user.phoneNumber || "";
  if (isOwner || visibility.dateOfBirth)
    profileUser.dateOfBirth = user.dateOfBirth || null;

  if (isOwner) {
    profileUser.isEmailVerified = user.isEmailVerified;
    profileUser.profileVisibility = visibility;
  }

  return profileUser;
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

  const followersCountPromise = Follow.countDocuments({
    followingUserId: targetId,
  });
  const followingCountPromise = Follow.countDocuments({
    followerUserId: targetId,
  });
  const isFollowingPromise =
    viewerId && !isOwner
      ? Follow.exists({ followerUserId: viewerId, followingUserId: targetId })
      : Promise.resolve(false);

  // Check mutual follow - both users must follow each other (inline logic)
  const isMutualFollowPromise =
    viewerId && !isOwner
      ? (async () => {
          const [aFollowsB, bFollowsA] = await Promise.all([
            Follow.exists({ followerUserId: viewerId, followingUserId: targetId }),
            Follow.exists({ followerUserId: targetId, followingUserId: viewerId }),
          ]);
          return Boolean(aFollowsB && bFollowsA);
        })()
      : Promise.resolve(false);

  const [totalPosts, followersCount, followingCount, isFollowing, isMutualFollow] =
    await Promise.all([
      Post.countDocuments(postFilter),
      followersCountPromise,
      followingCountPromise,
      isFollowingPromise,
      isMutualFollowPromise,
    ]);

  // Only return posts if: isOwner OR mutual follow
  const canViewPosts = isOwner || isMutualFollow;

  let posts = [];
  let pagination = {
    page,
    limit,
    total: 0,
    totalPages: 1,
  };

  if (canViewPosts) {
    posts = await Post.find(postFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    pagination = {
      page,
      limit,
      total: totalPosts,
      totalPages: Math.ceil(totalPosts / limit) || 1,
    };
  }

  const profileUser = toPublicUser(user, Boolean(isOwner));

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
      isMutualFollow: Boolean(isMutualFollow),
      canViewPosts: Boolean(canViewPosts),
    },
    posts,
    pagination,
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
  const exists = await Follow.exists({
    followerUserId: follower,
    followingUserId: following,
  });
  return Boolean(exists);
}

async function isMutualFollow(userAId, userBId) {
  const userA = safeObjectId(userAId);
  const userB = safeObjectId(userBId);

  const [aFollowsB, bFollowsA] = await Promise.all([
    Follow.exists({ followerUserId: userA, followingUserId: userB }),
    Follow.exists({ followerUserId: userB, followingUserId: userA }),
  ]);

  return Boolean(aFollowsB && bFollowsA);
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
    await Follow.create({
      followerUserId: follower,
      followingUserId: following,
    });
  } catch (e) {
    // Duplicate follow -> ignore
    if (e?.code !== 11000) throw e;
  }

  return { isFollowing: true };
}

async function unfollowUser(followerId, followingId) {
  const follower = safeObjectId(followerId);
  const following = safeObjectId(followingId);

  await Follow.deleteOne({
    followerUserId: follower,
    followingUserId: following,
  });
  return { isFollowing: false };
}

async function updateMyProfile({ userId, body }) {
  const id = safeObjectId(userId);

  const update = {};
  if (typeof body.fullname === "string") update.fullname = body.fullname.trim();
  if (typeof body.bio === "string") update.bio = body.bio.trim();
  if (typeof body.note === "string") update.bio = body.note.trim();
  if (typeof body.avatar === "string") update.avatar = body.avatar.trim();

  if (Object.keys(update).length === 0)
    throw new AppError("Nothing to update", 400);
  if (update.fullname && update.fullname.length > 120)
    throw new AppError("fullname is too long", 400);
  if (update.bio && update.bio.length > 200)
    throw new AppError("bio/note is too long", 400);

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

async function getMyAccountSettings(userId) {
  const id = safeObjectId(userId);
  const user = await User.findById(id).lean();
  if (!user) throw new AppError("User not found", 404);

  return {
    _id: user._id,
    fullname: user.fullname || "",
    username: user.username,
    email: user.email,
    phoneNumber: user.phoneNumber || "",
    dateOfBirth: user.dateOfBirth || null,
    avatar: user.avatar || "",
    bio: user.bio || "",
    isEmailVerified: user.isEmailVerified,
    profileVisibility: normalizeVisibility(user.profileVisibility),
    updatedAt: user.updatedAt,
  };
}

async function updateMyAccountSettings({ userId, body }) {
  const id = safeObjectId(userId);
  const user = await User.findById(id);
  if (!user) throw new AppError("User not found", 404);

  let changed = false;

  if (typeof body.fullname === "string") {
    const next = body.fullname.trim();
    if (!next) throw new AppError("fullname is required", 400);
    if (next.length > 120) throw new AppError("fullname is too long", 400);
    user.fullname = next;
    changed = true;
  }

  if (typeof body.bio === "string") {
    const next = body.bio.trim();
    if (next.length > 200) throw new AppError("bio/note is too long", 400);
    user.bio = next;
    changed = true;
  }

  if (typeof body.avatar === "string") {
    user.avatar = body.avatar.trim();
    changed = true;
  }

  if (typeof body.phoneNumber === "string") {
    const phoneNumber = body.phoneNumber.trim();
    if (phoneNumber.length > 20)
      throw new AppError("phone number is too long", 400);
    user.phoneNumber = phoneNumber;
    changed = true;
  }

  if (body.dateOfBirth === null || body.dateOfBirth === "") {
    user.dateOfBirth = null;
    changed = true;
  } else if (typeof body.dateOfBirth === "string" || body.dateOfBirth instanceof Date) {
    const dob = new Date(body.dateOfBirth);
    if (Number.isNaN(dob.getTime())) {
      throw new AppError("dateOfBirth is invalid", 400);
    }
    if (dob.getTime() > Date.now()) {
      throw new AppError("dateOfBirth cannot be in the future", 400);
    }
    user.dateOfBirth = dob;
    changed = true;
  }

  if (typeof body.email === "string") {
    const email = body.email.trim().toLowerCase();
    const isEmailFormatValid = /^\S+@\S+\.\S+$/.test(email);
    if (!isEmailFormatValid) throw new AppError("Invalid email", 400);

    const existed = await User.findOne({
      email,
      _id: { $ne: id },
    }).lean();

    if (existed) throw new AppError("Email already exists", 400);

    if (email !== user.email) {
      user.email = email;
      user.isEmailVerified = false;
      changed = true;
    }
  }

  if (body.profileVisibility && typeof body.profileVisibility === "object") {
    const visibility = normalizeVisibility({
      ...normalizeVisibility(user.profileVisibility),
      ...body.profileVisibility,
    });
    user.profileVisibility = visibility;
    changed = true;
  }

  const passwordFieldsProvided =
    typeof body.currentPassword === "string" ||
    typeof body.newPassword === "string" ||
    typeof body.confirmPassword === "string";

  if (passwordFieldsProvided) {
    const currentPassword = String(body.currentPassword || "");
    const newPassword = String(body.newPassword || "");
    const confirmPassword = String(body.confirmPassword || "");

    if (!currentPassword || !newPassword || !confirmPassword) {
      throw new AppError(
        "currentPassword, newPassword, confirmPassword are required",
        400,
      );
    }

    if (
      newPassword.length < PASSWORD_LENGTH_MIN ||
      newPassword.length > PASSWORD_LENGTH_MAX
    ) {
      throw new AppError(
        `Password must be between ${PASSWORD_LENGTH_MIN} and ${PASSWORD_LENGTH_MAX} characters`,
        400,
      );
    }

    if (newPassword !== confirmPassword) {
      throw new AppError("Password does not match", 400);
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new AppError("Current password is incorrect", 400);
    }

    user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
    changed = true;
  }

  if (!changed) {
    throw new AppError("Nothing to update", 400);
  }

  user.updatedAt = new Date();
  await user.save();

  return getMyAccountSettings(userId);
}

async function getBlockedUsers(userId) {
  const rows = await BlockUser.find({ blockerUserId: userId })
    .populate({ path: "blockedUserId", select: "fullname username avatar" })
    .select("blockedUserId")
    .lean();

  return rows.map((row) => {
    const blockedUser = row.blockedUserId || {};
    return {
      blockedUserId: blockedUser._id || row.blockedUserId,
      fullname: blockedUser.fullname || "",
      username: blockedUser.username || "",
      avatar: blockedUser.avatar || "",
    };
  });
}

async function getBlockedUserIds(userId) {
  const rows = await BlockUser.find({ blockerUserId: userId })
    .select("blockedUserId")
    .lean();
  return rows.map((r) => r.blockedUserId);
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
      (entry) => entry.blockedUserId.toString() === blockedId,
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
  await blockEntry.deleteOne();
}

module.exports = {
  // profile
  getProfile,
  updateMyProfile,
  getMyAccountSettings,
  updateMyAccountSettings,

  // follow
  getFollowingUserIds,
  getMutualFollowUserIds,
  getFollowersCount,
  getFollowingCount,
  isFollowingUser,
  isMutualFollow,
  followUser,
  unfollowUser,

  // block
  blockUser,
  unblockUser,
  getBlockedUsers,
  getBlockedUserIds,
  isBlocked,
};
