const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const AppError = require("../utils/appError");
const { randomUUID } = require("crypto");

const User = require("../models/user.model");
const EmailOTP = require("../models/emailOTP.model");
const RefreshToken = require("../models/refreshToken.model");
const Post = require("../models/post.model");
const BlockUser = require("../models/blockUser.model");
const Follow = require("../models/follow.model");
const Reaction = require("../models/reaction.model");
const Notification = require("../models/notification.model");
const emailService = require("./email.service");

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

const DEFAULT_PRIVACY_DATA = {
  allowFollowFromStrangers: true,
  allowPeopleInteraction: true,
  allowPeopleToSeeProfile: true,
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

function normalizePrivacyData(raw = {}) {
  const src = raw && typeof raw === "object" ? raw : {};

  return {
    allowFollowFromStrangers:
      typeof src.allowFollowFromStrangers === "boolean"
        ? src.allowFollowFromStrangers
        : DEFAULT_PRIVACY_DATA.allowFollowFromStrangers,
    allowPeopleInteraction:
      typeof src.allowPeopleInteraction === "boolean"
        ? src.allowPeopleInteraction
        : DEFAULT_PRIVACY_DATA.allowPeopleInteraction,
    allowPeopleToSeeProfile:
      typeof src.allowPeopleToSeeProfile === "boolean"
        ? src.allowPeopleToSeeProfile
        : DEFAULT_PRIVACY_DATA.allowPeopleToSeeProfile,
  };
}

function generateOtpCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateOtpExpiredAt() {
  return new Date(Date.now() + Number(process.env.OTP_EXPIRED_IN || 120000));
}

function toPublicUser(user, isOwner = false) {
  const visibility = normalizeVisibility(user?.profileVisibility);
  const privacyData = normalizePrivacyData(user?.privacyData);

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
    profileUser.privacyData = privacyData;
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
  const privacyData = normalizePrivacyData(user?.privacyData);

  if (!isOwner && privacyData.allowPeopleToSeeProfile === false) {
    throw new AppError("This user does not allow public profile viewing", 403);
  }

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
      // populate minimal fields needed by profile UIs (location/tags)
      .populate("placeId", "name")
      .populate("tags", "name color")
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

  const targetUser = await User.findById(following).select("privacyData").lean();
  if (!targetUser) throw new AppError("User not found", 404);

  const targetPrivacy = normalizePrivacyData(targetUser.privacyData);
  if (targetPrivacy.allowFollowFromStrangers === false) {
    const targetAlreadyFollowsMe = await Follow.exists({
      followerUserId: following,
      followingUserId: follower,
    });

    if (!targetAlreadyFollowsMe) {
      throw new AppError("This user does not allow follows from strangers", 403);
    }
  }

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

async function changePassword({ userId, currentPassword, newPassword }) {
  const bcrypt = require("bcrypt");
  const id = safeObjectId(userId);

  const user = await User.findById(id).select("+password");
  if (!user) {
    return { success: false, message: "User not found" };
  }

  // Verify current password
  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    return { success: false, message: "Current password is incorrect" };
  }

  // Hash new password
  const salt = await bcrypt.genSalt(Number(process.env.SALT_ROUNDS) || 10);
  user.password = await bcrypt.hash(newPassword, salt);

  await user.save();

  return { success: true };
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
    privacyData: normalizePrivacyData(user.privacyData),
    updatedAt: user.updatedAt,
  };
}

async function sendEmailChangeOtp({ userId, email }) {
  const id = safeObjectId(userId);
  const user = await User.findById(id).lean();
  if (!user) throw new AppError("User not found", 404);

  const nextEmail = String(email || "").trim().toLowerCase();
  const isEmailFormatValid = /^\S+@\S+\.\S+$/.test(nextEmail);
  if (!isEmailFormatValid) throw new AppError("Invalid email", 400);
  if (nextEmail === user.email) {
    throw new AppError("Email mới phải khác email hiện tại", 400);
  }

  const existed = await User.findOne({
    email: nextEmail,
    _id: { $ne: id },
  }).lean();
  if (existed) throw new AppError("Email already exists", 400);

  await EmailOTP.deleteMany({ userId: id, purpose: "CHANGE_EMAIL" });

  const plainOtp = generateOtpCode();
  const otpToken = randomUUID();

  await EmailOTP.create({
    otpToken,
    userId: id,
    targetEmail: nextEmail,
    otp: await bcrypt.hash(plainOtp, SALT_ROUNDS),
    purpose: "CHANGE_EMAIL",
    expiresAt: generateOtpExpiredAt(),
    isUsed: false,
    attempts: 0,
  });

  await emailService.sendOTP(nextEmail, plainOtp, "CHANGE_EMAIL");

  return {
    otpToken,
    targetEmail: nextEmail,
    expiresInMs: Number(process.env.OTP_EXPIRED_IN || 120000),
  };
}

async function requestDeleteAccountOtp({ userId }) {
  const id = safeObjectId(userId);
  const user = await User.findById(id).lean();
  if (!user) throw new AppError("User not found", 404);
  if (user.deletedAt) throw new AppError("Tài khoản đã bị xóa", 400);

  await EmailOTP.deleteMany({ userId: id, purpose: "DELETE_ACCOUNT" });

  const plainOtp = generateOtpCode();
  const otpToken = randomUUID();

  await EmailOTP.create({
    otpToken,
    userId: id,
    targetEmail: user.email,
    otp: await bcrypt.hash(plainOtp, SALT_ROUNDS),
    purpose: "DELETE_ACCOUNT",
    expiresAt: generateOtpExpiredAt(),
    isUsed: false,
    attempts: 0,
  });

  await emailService.sendOTP(user.email, plainOtp, "DELETE_ACCOUNT");

  return {
    otpToken,
    email: user.email,
    expiresInMs: Number(process.env.OTP_EXPIRED_IN || 120000),
  };
}

async function confirmDeleteAccount({ userId, otpToken, otpCode }) {
  const id = safeObjectId(userId);
  const user = await User.findById(id);
  if (!user) throw new AppError("User not found", 404);
  if (user.deletedAt) throw new AppError("Tài khoản đã bị xóa", 400);

  const token = String(otpToken || "").trim();
  const code = String(otpCode || "").trim();
  if (!token || !code) {
    throw new AppError("otpToken và otpCode là bắt buộc", 400);
  }

  const otpDoc = await EmailOTP.findOne({
    otpToken: token,
    userId: id,
    purpose: "DELETE_ACCOUNT",
    isUsed: false,
  });

  if (!otpDoc) throw new AppError("OTP không hợp lệ", 400);
  if (otpDoc.expiresAt.getTime() <= Date.now()) {
    throw new AppError("Mã OTP đã hết hạn", 400);
  }
  if ((otpDoc.attempts || 0) >= 5) {
    throw new AppError("OTP bị khóa do nhập sai quá nhiều lần", 429);
  }

  const isOtpValid = await bcrypt.compare(code, otpDoc.otp);
  if (!isOtpValid) {
    otpDoc.attempts = (otpDoc.attempts || 0) + 1;
    await otpDoc.save();
    throw new AppError("Mã OTP không đúng", 400);
  }

  otpDoc.isUsed = true;
  await otpDoc.save();

  const suffix = `${Date.now()}_${String(user._id).slice(-6)}`;
  user.fullname = "Deleted User";
  user.username = `deleted_${suffix}`;
  user.email = `deleted+${suffix}@laca.local`;
  user.avatar = "";
  user.bio = "";
  user.phoneNumber = "";
  user.dateOfBirth = null;
  user.isActive = false;
  user.isEmailVerified = false;
  user.deletedAt = new Date();
  user.updatedAt = new Date();
  await user.save();

  await RefreshToken.updateMany({ userId: id, isRevoked: false }, { $set: { isRevoked: true } });
  await EmailOTP.deleteMany({ userId: id });

  return { deleted: true };
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
      const emailOtpToken = String(body.emailOtpToken || "").trim();
      const emailOtpCode = String(body.emailOtpCode || "").trim();

      if (!emailOtpToken || !emailOtpCode) {
        throw new AppError(
          "Vui lòng xác thực OTP cho email mới trước khi cập nhật",
          400,
        );
      }

      const otpDoc = await EmailOTP.findOne({
        otpToken: emailOtpToken,
        userId: id,
        targetEmail: email,
        purpose: "CHANGE_EMAIL",
        isUsed: false,
      });

      if (!otpDoc) {
        throw new AppError("OTP không hợp lệ hoặc không khớp email", 400);
      }

      if (otpDoc.expiresAt.getTime() <= Date.now()) {
        throw new AppError("Mã OTP đã hết hạn", 400);
      }

      if ((otpDoc.attempts || 0) >= 5) {
        throw new AppError("OTP bị khóa do nhập sai quá nhiều lần", 429);
      }

      const isOtpValid = await bcrypt.compare(emailOtpCode, otpDoc.otp);
      if (!isOtpValid) {
        otpDoc.attempts = (otpDoc.attempts || 0) + 1;
        await otpDoc.save();
        throw new AppError("Mã OTP không đúng", 400);
      }

      otpDoc.isUsed = true;
      await otpDoc.save();

      user.email = email;
      user.isEmailVerified = true;
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

  if (body.privacyData && typeof body.privacyData === "object") {
    const privacyData = normalizePrivacyData({
      ...normalizePrivacyData(user.privacyData),
      ...body.privacyData,
    });
    user.privacyData = privacyData;
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

async function getMyRecentActivities({ userId, query = {} }) {
  const id = safeObjectId(userId);
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
  const batchSize = Math.max(20, page * limit * 2);

  const [notifications, posts, reactions, follows] = await Promise.all([
    Notification.find({ recipientId: id })
      .populate("senderId", "fullname username avatar")
      .sort({ createdAt: -1 })
      .limit(batchSize)
      .lean(),

    Post.find({ userId: id })
      .select("_id content createdAt")
      .sort({ createdAt: -1 })
      .limit(batchSize)
      .lean(),

    Reaction.find({ userId: id })
      .select("_id postId type createdAt")
      .sort({ createdAt: -1 })
      .limit(batchSize)
      .lean(),

    Follow.find({ followerUserId: id })
      .populate("followingUserId", "fullname username avatar")
      .select("_id followingUserId createdAt")
      .sort({ createdAt: -1 })
      .limit(batchSize)
      .lean(),
  ]);

  const notificationItems = notifications.map((n) => {
    const sender =
      n?.senderId && typeof n.senderId === "object" ? n.senderId : null;
    const senderId = sender?._id ? String(sender._id) : null;

    return {
      id: String(n._id),
      kind: "notification",
      title: n.title || "Thông báo",
      description: n.body || "",
      createdAt: n.createdAt,
      link:
        n.link ||
        (n.refModel === "Post" && n.refId ? `/posts/${String(n.refId)}` : ""),
      isRead: Boolean(n.isRead),
      actor: sender
        ? {
            id: senderId,
            name: sender.fullname || sender.username || "Người dùng",
            avatar: sender.avatar || "",
          }
        : null,
    };
  });

  const postItems = posts.map((p) => ({
    id: String(p._id),
    kind: "post_created",
    title: "Bạn đã đăng một bài viết",
    description: (p.content || "").trim().slice(0, 120),
    createdAt: p.createdAt,
    link: `/posts/${String(p._id)}`,
    isRead: true,
    actor: null,
  }));

  const reactionItems = reactions.map((r) => ({
    id: String(r._id),
    kind: "reaction_created",
    title: "Bạn đã thả cảm xúc cho một bài viết",
    description: r.type ? `Loại cảm xúc: ${r.type}` : "",
    createdAt: r.createdAt,
    link: r.postId ? `/posts/${String(r.postId)}` : "",
    isRead: true,
    actor: null,
  }));

  const followItems = follows.map((f) => {
    const target =
      f?.followingUserId && typeof f.followingUserId === "object"
        ? f.followingUserId
        : null;
    const targetId = target?._id ? String(target._id) : null;
    const targetName = target?.fullname || target?.username || "người dùng";

    return {
      id: String(f._id),
      kind: "follow_created",
      title: `Bạn đã theo dõi ${targetName}`,
      description: "",
      createdAt: f.createdAt,
      link: targetId ? `/profile/${targetId}` : "",
      isRead: true,
      actor: target
        ? {
            id: targetId,
            name: targetName,
            avatar: target.avatar || "",
          }
        : null,
    };
  });

  const merged = [...notificationItems, ...postItems, ...reactionItems, ...followItems]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = merged.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const activities = merged.slice(start, start + limit);

  return {
    activities,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
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

async function getMyPrivacyData(userId) {
  const id = safeObjectId(userId);
  const user = await User.findById(id).select("privacyData").lean();
  if (!user) throw new AppError("User not found", 404);

  return normalizePrivacyData(user.privacyData);
}

async function updateMyPrivacyData({ userId, body }) {
  const id = safeObjectId(userId);
  const user = await User.findById(id);
  if (!user) throw new AppError("User not found", 404);

  const incoming = body && typeof body === "object" ? body : {};
  const nextPrivacyData = normalizePrivacyData({
    ...normalizePrivacyData(user.privacyData),
    ...incoming,
  });

  const prevPrivacyData = normalizePrivacyData(user.privacyData);
  const changed =
    prevPrivacyData.allowFollowFromStrangers !==
      nextPrivacyData.allowFollowFromStrangers ||
    prevPrivacyData.allowPeopleInteraction !==
      nextPrivacyData.allowPeopleInteraction ||
    prevPrivacyData.allowPeopleToSeeProfile !==
      nextPrivacyData.allowPeopleToSeeProfile;

  if (!changed) return prevPrivacyData;

  user.privacyData = nextPrivacyData;
  user.updatedAt = new Date();
  await user.save();

  return nextPrivacyData;
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
  changePassword,
  getMyAccountSettings,
  sendEmailChangeOtp,
  requestDeleteAccountOtp,
  confirmDeleteAccount,
  updateMyAccountSettings,
  getMyRecentActivities,

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
  getMyPrivacyData,
  updateMyPrivacyData,
};
