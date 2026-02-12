const express = require("express");
const router = express.Router();
// Import hàm createReport vừa viết ở bước 1
const { createReport } = require("../controllers/feedback.controller");

// Định nghĩa: POST /api/reports sẽ chạy hàm createReport
router.post("/", createReport);

module.exports = router;
