const jwtUtil = require("../utils/jwt");
const User = require("../models/user.model");

/**
 * Middleware: Protect routes (kiểm tra token)
 * Default export - dùng như: app.use(auth) hoặc router.post("/", auth, ...)
 */
module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader)
      return res.status(401).json({ message: "Authorization header missing" });

    const token = authHeader.split(" ")[1];

    if (!token)
      return res.status(401).json({ message: "Access token missing" });

    const decoded = jwtUtil.verifyAccessToken(token);

    // Fetch full user from DB để có role, avatar, v.v.
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user; // Gán toàn bộ user object

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
