const {
  getDashboardStats,
  getRecentActivities,
} = require("../services/admin.service");

exports.getDashboard = async (req, res) => {
  try {
    const data = await getDashboardStats();
    return res.json(data);
  } catch (e) {
    return res
      .status(500)
      .json({ message: "Failed to load dashboard", error: e?.message });
  }
};

exports.getRecentActivity = async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(Number(req.query.limit) || 5, 20));
    const data = await getRecentActivities(limit);
    return res.json(data);
  } catch (e) {
    return res
      .status(500)
      .json({ message: "Failed to load recent activity", error: e?.message });
  }
};
