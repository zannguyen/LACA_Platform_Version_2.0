const asyncHandler = require("../utils/asyncHandler");
const UserService = require("../services/user.service");

const blockUser = asyncHandler(async (req, res) => {
  const blockedId = req.params.id;
  const blockerId = req.user.id;
  await UserService.blockUser(blockerId, blockedId);
  res.status(200).json({
    success: true,
    message: "User blocked successfully",
  });
});

const unblockUser = asyncHandler(async (req, res) => {
  const blockedId = req.params.id;
  const blockerId = req.user.id;
  await UserService.unblockUser(blockerId, blockedId);
  res.status(200).json({
    success: true,
    message: "User unblocked successfully",
  });
});

module.exports = {
  blockUser,
  unblockUser,
};
