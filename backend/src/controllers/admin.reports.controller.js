const service = require("../services/admin.reports.service");

exports.listReports = async (req, res, next) => {
  try {
    const {
      status = "pending",
      targetType = "post",
      category,
      q,
      page = 1,
      limit = 20,
    } = req.query;

    const result = await service.listReports({
      status,
      targetType,
      category,
      q,
      page: Number(page),
      limit: Number(limit),
    });

    return res.json({ success: true, ...result });
  } catch (err) {
    return next(err);
  }
};

exports.getReport = async (req, res, next) => {
  try {
    const data = await service.getReport(req.params.id);
    return res.json({ success: true, data });
  } catch (err) {
    return next(err);
  }
};

exports.handleReport = async (req, res, next) => {
  try {
    const adminId = req.user?._id;
    const reportId = req.params.id;
    const { status, actionTaken, note } = req.body;

    const updated = await service.handleReport({
      reportId,
      adminId,
      status,
      actionTaken,
      note,
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    return next(err);
  }
};
