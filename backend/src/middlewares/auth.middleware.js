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

    // verify token
    let decoded;
    try {
      decoded = jwtUtil.verifyAccessToken(token);
    } catch (e) {
      return res.status(401).json({
        message: "Invalid or expired token",
        detail: e?.message,
      });
    }

    // ✅ support multiple keys
    const userId =
      decoded?.userId ||
      decoded?.userID ||
      decoded?.id ||
      decoded?._id ||
      decoded?.sub;

    if (!userId) {
      return res.status(401).json({ message: "Invalid token: missing userId" });
    }

    const user = await User.findById(userId).select(
      "_id role isActive isEmailVerified deletedAt suspendUntil"
    );

    if (!user) {
      return res.status(401).json({ message: "Invalid token: user not found" });
    }

    if (user.deletedAt) return res.status(403).json({ message: "Account deleted" });

    if (user.suspendUntil && user.suspendUntil.getTime() > Date.now()) {
      return res.status(403).json({
        message: "Account suspended",
        suspendUntil: user.suspendUntil,
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({ message: "Account blocked" });
    }

    // set req.user cho toàn project dùng được
    req.user = {
      _id: user._id,
      id: String(user._id),
      role: user.role,
    };

    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
