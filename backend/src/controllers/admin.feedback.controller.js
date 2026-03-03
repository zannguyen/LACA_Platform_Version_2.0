// controllers/admin.feedback.controller.js
const Feedback = require("../models/feedback.model");
const User = require("../models/user.model");
const sendEmail = require("../utils/mailer");
const asyncHandler = require("../utils/asyncHandler");

// Get all feedbacks with filters (status, pagination)
const getAllFeedbacks = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;

  // Build filter
  const filter = {};
  if (status) filter.status = status;

  // Count total
  const total = await Feedback.countDocuments(filter);

  // Get feedbacks with user info
  const feedbacks = await Feedback.find(filter)
    .populate("userId", "fullname email username")
    .populate("repliedBy", "fullname")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  // Add userEmail to each feedback
  const feedbacksWithEmail = feedbacks.map((f) => {
    const obj = f.toObject();
    obj.userEmail = f.userId?.email || "";
    return obj;
  });

  res.status(200).json({
    success: true,
    data: feedbacksWithEmail,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

// Get single feedback by ID
const getFeedbackById = asyncHandler(async (req, res) => {
  const { feedbackId } = req.params;

  const feedback = await Feedback.findById(feedbackId)
    .populate("userId", "fullname email username")
    .populate("repliedBy", "fullname");

  if (!feedback) {
    return res.status(404).json({
      success: false,
      message: "Feedback not found",
    });
  }

  const obj = feedback.toObject();
  obj.userEmail = feedback.userId?.email || "";

  res.status(200).json({
    success: true,
    data: obj,
  });
});

// Reply to feedback and send email
const replyFeedback = asyncHandler(async (req, res) => {
  const { feedbackId } = req.params;
  const { reply, sendEmail: shouldSendEmail = true } = req.body;

  if (!reply || reply.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: "Reply content is required",
    });
  }

  const feedback = await Feedback.findById(feedbackId).populate("userId", "email fullname");

  if (!feedback) {
    return res.status(404).json({
      success: false,
      message: "Feedback not found",
    });
  }

  // Check if user exists
  if (!feedback.userId) {
    return res.status(400).json({
      success: false,
      message: "Cannot reply: user information not found",
    });
  }

  // Update feedback with reply
  feedback.reply = reply.trim();
  feedback.repliedBy = req.user.id;
  feedback.repliedAt = new Date();
  feedback.status = "resolved";

  await feedback.save();

  // Send email if requested
  if (shouldSendEmail) {
    const userEmail = feedback.userId.email;
    const userName = feedback.userId.fullname || "User";

    const emailSubject = `[LACA] Phản hồi về góp ý của bạn`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Xin chào ${userName},</h2>
        <p>Cảm ơn bạn đã gửi góp ý cho LACA.</p>

        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0;"><strong>Nội dung bạn đã gửi:</strong></p>
          <p style="margin: 0; color: #666;">${feedback.content}</p>
        </div>

        <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0;"><strong>Phản hồi từ Admin:</strong></p>
          <p style="margin: 0; color: #2e7d32;">${reply}</p>
        </div>

        <p style="color: #666; font-size: 14px;">
          Nếu bạn có thêm câu hỏi, vui lòng liên hệ với chúng tôi.
        </p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          LACA Team
        </p>
      </div>
    `;

    try {
      await sendEmail({
        email: userEmail,
        subject: emailSubject,
        html: emailHtml,
      });
    } catch (emailError) {
      console.error("Failed to send email:", emailError);
      // Still return success since feedback was saved
    }
  }

  res.status(200).json({
    success: true,
    message: "Reply sent successfully",
    data: {
      reply: feedback.reply,
      repliedAt: feedback.repliedAt,
      repliedBy: feedback.repliedBy,
    },
  });
});

// Mark feedback as read
const markAsRead = asyncHandler(async (req, res) => {
  const { feedbackId } = req.params;

  const feedback = await Feedback.findById(feedbackId);

  if (!feedback) {
    return res.status(404).json({
      success: false,
      message: "Feedback not found",
    });
  }

  feedback.status = feedback.status === "new" ? "read" : feedback.status;
  await feedback.save();

  res.status(200).json({
    success: true,
    message: "Feedback marked as read",
    data: feedback,
  });
});

module.exports = {
  getAllFeedbacks,
  getFeedbackById,
  replyFeedback,
  markAsRead,
};
