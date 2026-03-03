const Feedback = require("../models/feedback.model");
const asyncHandler = require("../utils/asyncHandler");

// Hàm gửi Feedback mới
const createFeedback = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const userId = req.user?.id || null;

  // Tạo feedback mới trong Database
  const newFeedback = await Feedback.create({
    content,
    userId,
  });

  // Trả về kết quả thành công
  res.status(201).json({
    success: true,
    message: "Gửi góp ý thành công!",
    data: newFeedback,
  });
});

module.exports = {
  createFeedback,
};
