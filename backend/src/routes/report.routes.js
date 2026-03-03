const express = require("express");
const router = express.Router();
const reportService = require("../services/report.service");
const auth = require("../middlewares/auth.middleware");

// POST /api/reports - Create a new report (requires authentication)
router.post("/", auth, async (req, res, next) => {
  try {
    const reporterId = req.user.id;
    const { targetId, targetType, reason, category, description } = req.body;

    // Validate required fields
    if (!targetId || !targetType || !reason) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin bắt buộc"
      });
    }

    // Validate targetType
    if (!["post", "user", "place"].includes(targetType)) {
      return res.status(400).json({
        success: false,
        message: "Loại báo cáo không hợp lệ"
      });
    }

    // Validate category if provided
    const validCategories = ["spam", "harassment", "inappropriate", "false_info", "other"];
    if (category && !validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: "Danh mục báo cáo không hợp lệ"
      });
    }

    const report = await reportService.createReport({
      reporterId,
      targetId,
      targetType,
      reason,
      category: category || "other",
      description: description || ""
    });

    return res.status(201).json({
      success: true,
      message: "Báo cáo của bạn đã được gửi. Cảm ơn bạn đã phản hồi!",
      data: report
    });
  } catch (error) {
    console.error("Create report error:", error);
    return res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi gửi báo cáo"
    });
  }
});

module.exports = router;
