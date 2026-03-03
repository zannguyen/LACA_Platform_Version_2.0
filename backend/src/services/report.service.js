const Report = require("../models/report.model");

const createReport = async (data) => {
  const { reporterId, targetId, targetType, reason, category, description } = data;

  const report = new Report({
    reporterId,
    targetId,
    targetType,
    reason,
    category: category || "other",
    description: description || "",
    status: "pending",
    actionTaken: "none"
  });

  return await report.save();
};

const getReportsByUser = async (reporterId, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;

  const [reports, total] = await Promise.all([
    Report.find({ reporterId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("targetId", "content images"),
    Report.countDocuments({ reporterId })
  ]);

  return {
    items: reports,
    total,
    page,
    limit
  };
};

module.exports = {
  createReport,
  getReportsByUser
};
