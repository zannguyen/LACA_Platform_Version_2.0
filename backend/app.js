const express = require("express");
const cors = require("cors");
const feedbackRouter = require('./src/routes/feedback.route');
const reportRouter = require('./src/routes/report.route');
const chatRoute = require('./src/routes/chat.route');

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
app.use("/api/auth", require("./src/routes/auth.route"));
app.use("/api/posts", require("./src/routes/post.route"));
app.use("/api/reactions", require("./src/routes/reaction.route"));
app.use("/api/upload", require("./src/routes/upload.route"));
app.use('/api/feedbacks', feedbackRouter);
app.use('/api/reports', reportRouter);
app.use('/api/chat', chatRoute);

const errorHandler = require("./src/middlewares/error.middleware");
app.use(errorHandler);

module.exports = app;
