const express = require("express");
const cors = require("cors");

const app = express();

// CORS
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);

app.use(express.json());

// routes
app.use("/api/admin", require("./src/routes/admin.routes"));
app.use("/api/auth", require("./src/routes/auth.route"));
app.use("/api/posts", require("./src/routes/post.route"));
app.use("/api/reactions", require("./src/routes/reaction.route"));
app.use("/api/upload", require("./src/routes/upload.route"));
app.use("/api/map", require("./src/routes/map.route"));
app.use("/api/user", require("./src/routes/user.route"));

const errorHandler = require("./src/middlewares/error.middleware");
app.use(errorHandler);

module.exports = app;
