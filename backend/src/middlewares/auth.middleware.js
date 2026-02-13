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

    // Support multiple payload keys across the project.
    // jwt.js currently signs tokens with { userID }, while some code expects { userId }.
    const uid = decoded?.userId || decoded?.userID || decoded?.id || decoded?._id || decoded?.sub;
    if (!uid) {
      return res.status(401).json({ message: "Token payload missing userId" });
    }

    req.user = { id: uid };

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
