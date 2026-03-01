const express = require("express");
const router = express.Router();
const { createFeedback } = require("../controllers/feedback.controller");

// Khi Frontend gọi POST vào đường dẫn này -> Chạy hàm createFeedback
router.post("/", createFeedback);

module.exports = router;
