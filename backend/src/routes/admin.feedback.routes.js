// routes/admin.feedback.routes.js
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/auth.middleware");
const { requireAdmin } = require("../middlewares/requireAdmin");

const adminFeedbackController = require("../controllers/admin.feedback.controller");

// Apply auth + admin to all routes
router.use(authMiddleware);
router.use(requireAdmin);

// Get all feedbacks/reports with filters
router.get("/", adminFeedbackController.getAllFeedbacks);

// Get single feedback by ID
router.get("/:feedbackId", adminFeedbackController.getFeedbackById);

// Reply to feedback and send email
router.post("/:feedbackId/reply", adminFeedbackController.replyFeedback);

// Mark feedback as read
router.put("/:feedbackId/read", adminFeedbackController.markAsRead);

module.exports = router;
