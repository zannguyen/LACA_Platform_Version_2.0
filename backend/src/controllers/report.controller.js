const reportService = require("../services/report.service");

exports.createReport = async (req, res, next) => {
  try {
    const reporterId = req.user?._id;
    const { targetId, targetType, reason, category, description } = req.body;

    const created = await reportService.createReport({
      reporterId,
      targetId,
      targetType,
      reason,
      category,
      description,
    });

    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    return next(err);
  }
};
