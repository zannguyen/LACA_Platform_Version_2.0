const Feedback = require("../models/feedback.model");
const asyncHandler = require("../utils/asyncHandler");

// Hàm gửi Feedback mới
const createFeedback = asyncHandler(async (req, res) => {
  const { content, type, userId } = req.body;

  // Tạo feedback mới trong Database
  const newFeedback = await Feedback.create({
    content,
    type,
    userId: userId || null,
  });

  // Trả về kết quả thành công
  res.status(201).json({
    success: true,
    message: "Gửi góp ý thành công!",
    data: newFeedback,
  });
});

// Xử lý Báo lỗi (Report Issue)
const createReport = asyncHandler(async (req, res) => {
  const { content, userId } = req.body;

  // Logic giống feedback, nhưng set type = 'report'
  const newReport = await Feedback.create({
    content,
    type: "report",
    userId: userId || null,
    status: "new",
  });

  res.status(201).json({
    success: true,
    message: "Gửi báo lỗi thành công! Chúng tôi sẽ kiểm tra sớm.",
    data: newReport,
  });
});

module.exports = {
  createFeedback,
  createReport,
};
