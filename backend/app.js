const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

// nếu deploy sau reverse proxy (Render/NGINX) + có dùng cookie secure thì nên bật:
app.set("trust proxy", 1);

const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: function (origin, cb) {
      // cho phép request không có origin (Postman/cURL)
      if (!origin) return cb(null, true);

      // nếu chưa set env thì fallback dev
      if (allowedOrigins.length === 0) return cb(null, true);

      if (allowedOrigins.includes(origin)) return cb(null, true);

      return cb(new Error("Not allowed by CORS: " + origin));
    },
    credentials: true,
  }),
);

app.use(express.json());

// routes
app.use("/api/admin", require("./src/routes/admin.routes"));
app.use("/api/admin/users", require("./src/routes/admin.users.routes"));
app.use("/api/admin/reports", require("./src/routes/admin.reports.routes"));
app.use("/api/auth", require("./src/routes/auth.route"));
app.use("/api/posts", require("./src/routes/post.route"));
app.use("/api/reactions", require("./src/routes/reaction.route"));
app.use("/api/upload", require("./src/routes/upload.route"));
app.use("/api/map", require("./src/routes/map.route"));
app.use("/api/user", require("./src/routes/user.route"));
app.use("/api/feedbacks", require("./src/routes/feedback.route"));
app.use("/api/reports", require("./src/routes/report.route"));
app.use("/api/chat", require("./src/routes/chat.route"));
app.use("/api/places", require("./src/routes/place.route"));

const errorHandler = require("./src/middlewares/error.middleware");
app.use(errorHandler);

module.exports = app;
