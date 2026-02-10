const jwt = require("jsonwebtoken");
const User = require("../models/user.model"); // đổi đúng tên file User model nếu khác

const getUserIdFromPayload = (p) => {
  if (!p) return null;

  const direct =
    p.userId || p._id || p.id || p.sub || p.uid || p.user_id || p.userID;
  if (direct) return String(direct);

  const nested =
    p.user?._id ||
    p.user?.id ||
    p.user?.userId ||
    p.data?._id ||
    p.data?.id ||
    p.data?.userId ||
    p.payload?._id ||
    p.payload?.id ||
    p.payload?.userId;

  if (nested) return String(nested);

  return null;
};

exports.requireAdmin = async (req, res, next) => {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : null;
    if (!token) return res.status(401).json({ message: "Missing token" });

    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret)
      return res.status(500).json({ message: "Missing JWT_ACCESS_SECRET" });

    // decode để debug khi cần (có thể comment sau)
    const decoded = jwt.decode(token);
    // console.log("DECODED JWT:", decoded);

    const payload = jwt.verify(token, secret);

    const userId =
      getUserIdFromPayload(payload) || getUserIdFromPayload(decoded);
    if (!userId) {
      return res.status(401).json({
        message: "Invalid token: missing userId",
        hint: "Check JWT payload structure (enable console.log(DECODED JWT) in requireAdmin)",
      });
    }

    const user = await User.findById(userId).select("role").lean();
    if (!user) return res.status(401).json({ message: "User not found" });

    if (user.role !== "admin")
      return res.status(403).json({ message: "Forbidden" });

    req.user = { userId, role: user.role, jwt: payload };
    next();
  } catch (e) {
    return res
      .status(401)
      .json({ message: "Invalid token", detail: e?.message });
  }
};
