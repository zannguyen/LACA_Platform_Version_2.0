const jwtUtil = require("../utils/jwt");

module.exports = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader)
      return res.status(401).json({ message: "Authorization header missing" });

    const token = authHeader.split(" ")[1];

    if (!token)
      return res.status(401).json({ message: "Access token missing" });

    const decoded = jwtUtil.verifyAccessToken(token);

    req.user = { id: decoded.userId }; // 👈 CHÍNH XÁC

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
