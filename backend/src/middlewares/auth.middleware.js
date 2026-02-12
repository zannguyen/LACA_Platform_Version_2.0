// middlewares/auth.middleware.js
const jwtUtil = require("../utils/jwt");
const User = require("../models/user.model");

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    if (!authHeader) {
      return res.status(401).json({ message: "Authorization header missing" });
    }

    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : authHeader.trim();

    if (!token) {
      return res.status(401).json({ message: "Access token missing" });
    }

    let decoded;
    try {
      decoded = jwtUtil.verifyAccessToken(token);
    } catch (e) {
      return res.status(401).json({
        message: "Invalid or expired token",
        detail: e?.message,
      });
    }

    // ✅ QUAN TRỌNG: jwt.js của bạn dùng userID
    const userId =
      decoded?.userID ||
      decoded?.userId ||
      decoded?._id ||
      decoded?.id ||
      decoded?.sub;

    if (!userId) {
      return res.status(401).json({ message: "Invalid token: missing userId" });
    }

    const user = await User.findById(userId).select(
      "_id role isActive isEmailVerified deletedAt suspendUntil",
    );

    if (!user) {
      return res.status(401).json({ message: "Invalid token: user not found" });
    }

    // ✅ enforce status
    if (user.deletedAt) {
      return res.status(403).json({ message: "Account deleted" });
    }

    if (user.suspendUntil && user.suspendUntil.getTime() > Date.now()) {
      return res.status(403).json({
        message: "Account suspended",
        suspendUntil: user.suspendUntil,
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({ message: "Account blocked" });
    }

    // ✅ attach req.user
    req.user = {
      id: String(user._id),
      role: user.role,
      isEmailVerified: !!user.isEmailVerified,
    };

    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
