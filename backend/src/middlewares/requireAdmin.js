// backend/src/middlewares/requireAdmin.js
const User = require("../models/user.model");

exports.requireAdmin = (req, res, next) => {
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Forbidden" });
  return next();
};
