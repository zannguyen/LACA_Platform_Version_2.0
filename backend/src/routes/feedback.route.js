const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const { createFeedback } = require("../controllers/feedback.controller");

// Khi Frontend gọi POST vào đường dẫn này -> Chạy hàm createFeedback
router.post("/", authMiddleware, createFeedback);

module.exports = router;
