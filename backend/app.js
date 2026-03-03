const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config({ path: __dirname + "/../.env" });

const app = express();

// nếu deploy sau reverse proxy (Render/NGINX) + có dùng cookie secure thì nên bật:
app.set("trust proxy", 1);

// CORS configuration - allow all origins for production flexibility
// In production, you can restrict this via CORS_ORIGINS env variable
const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

console.log("[CORS] Allowed origins:", allowedOrigins.length > 0 ? allowedOrigins : "All origins allowed");

app.use(
  cors({
    origin: function (origin, cb) {
      // cho phép request không có origin (Postman/cURL, mobile apps)
      if (!origin) return cb(null, true);

      // nếu chưa set env thì fallback cho phép tất cả
      if (allowedOrigins.length === 0) return cb(null, true);

      if (allowedOrigins.includes(origin)) return cb(null, true);

      return cb(new Error("Not allowed by CORS: " + origin));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
    exposedHeaders: ["Content-Length", "Content-Type"],
    optionsSuccessStatus: 204,
  }),
);

// Handle preflight requests explicitly - use regex wildcard instead of *
app.options(/.*/, cors());

app.use(express.json());
app.use(cookieParser());

// routes
app.use("/api/admin", require("./src/routes/admin.routes"));
app.use("/api/admin/users", require("./src/routes/admin.users.routes"));
app.use("/api/admin/reports", require("./src/routes/admin.reports.routes"));
app.use("/api/admin/feedbacks", require("./src/routes/admin.feedback.routes"));
app.use("/api/auth", require("./src/routes/auth.route"));
app.use("/api/posts", require("./src/routes/post.route"));
app.use("/api/reactions", require("./src/routes/reaction.route"));
app.use("/api/upload", require("./src/routes/upload.route"));
app.use("/api/map", require("./src/routes/map.route"));
app.use("/api/user", require("./src/routes/user.route"));
app.use("/api/feedbacks", require("./src/routes/feedback.route"));
app.use("/api/chat", require("./src/routes/chat.route"));
app.use("/api/places", require("./src/routes/place.route"));
app.use("/api/notifications", require("./src/routes/notification.route"));
app.use("/api/interests", require("./src/routes/interest.route"));
app.use("/api/analysis", require("./src/routes/analysis.route"));
app.use("/api/recommendations", require("./src/routes/recommendation.route"));
app.use("/api/tags", require("./src/routes/tag.route"));
app.use("/api/admin", require("./src/routes/queue.route")); // Queue admin endpoints
app.use("/api/ranking", require("./src/routes/ranking.route")); // Featured ranking
app.use("/api/chatbot", require("./src/routes/chatbot.route")); // AI Chatbot
app.use("/api/reports", require("./src/routes/report.routes")); // User reports

const errorHandler = require("./src/middlewares/error.middleware");
app.use(errorHandler);

module.exports = app;
