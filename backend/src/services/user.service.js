const BlockUser = require("../models/blockUser.model");
const AppError = require("../utils/appError");
const User = require("../models/user.model");

const getBlockedUsers = async (userId) => {
  return await BlockUser.find({ blockerUserId: userId }).select(
    "blockedUserId",
  );
};

const getBlockedUserIds = async (userId) => {
  const blocked = await BlockUser.find({ blockerUserId: userId })
    .select("blockedUserId")
    .lean();

  return blocked.map((entry) => entry.blockedUserId);
};

const isBlocked = async (blockerId, blockedId) => {
  const exists = await BlockUser.exists({
    blockerUserId: blockerId,
    blockedUserId: blockedId,
  });

  return Boolean(exists);
};

const blockUser = async (blockerId, blockedId) => {
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
};

const unblockUser = async (blockerId, blockedId) => {
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
};

module.exports = {
  blockUser,
  getBlockedUsers,
  getBlockedUserIds,
  isBlocked,
  unblockUser,
};
