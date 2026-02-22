const interestService = require("../services/interest.service");
const asyncHandler = require("../utils/asyncHandler");

// Lấy tất cả sở thích có sẵn (public)
exports.getAllInterests = asyncHandler(async (req, res) => {
  const interests = await interestService.getAllInterests();
  res.status(200).json({
    success: true,
    data: interests,
  });
});

// Lấy sở thích theo ID
exports.getInterestById = asyncHandler(async (req, res) => {
  const interest = await interestService.getInterestById(req.params.id);
  res.status(200).json({
    success: true,
    data: interest,
  });
});

// Tạo sở thích mới (admin)
exports.createInterest = asyncHandler(async (req, res) => {
  const interest = await interestService.createInterest(req.body);
  res.status(201).json({
    success: true,
    message: "Interest created successfully",
    data: interest,
  });
});

// Cập nhật sở thích (admin)
exports.updateInterest = asyncHandler(async (req, res) => {
  const interest = await interestService.updateInterest(
    req.params.id,
    req.body,
  );
  res.status(200).json({
    success: true,
    message: "Interest updated successfully",
    data: interest,
  });
});

// Xóa sở thích (admin)
exports.deleteInterest = asyncHandler(async (req, res) => {
  const result = await interestService.deleteInterest(req.params.id);
  res.status(200).json({
    success: true,
    ...result,
  });
});

// Cập nhật tất cả sở thích của người dùng hiện tại (ghi đè)
exports.updateMyInterests = asyncHandler(async (req, res) => {
  const { interestIds } = req.body;
  const interests = await interestService.updateUserInterests(
    req.user._id,
    interestIds,
  );
  res.status(200).json({
    success: true,
    message: "Interests updated successfully",
    data: interests,
  });
});

// Lấy sở thích của người dùng hiện tại
exports.getMyInterests = asyncHandler(async (req, res) => {
  const interests = await interestService.getUserInterests(req.user._id);
  res.status(200).json({
    success: true,
    data: interests,
  });
});

// Lấy sở thích của người dùng khác
exports.getUserInterests = asyncHandler(async (req, res) => {
  const interests = await interestService.getUserInterests(req.params.userId);
  res.status(200).json({
    success: true,
    data: interests,
  });
});
