const express = require("express");
const router = express.Router();
const {
  sendMessage,
  getMessages,
  getConversations,
  searchUsers,
  getOrCreateConversation,
  markRead,
} = require("../controllers/chat.controller");
const protect = require("../middlewares/auth.middleware");

// Routes cụ thể PHẢI ở trước routes với params
router.post("/send", protect, sendMessage);
router.post("/read/:receiverId", protect, markRead);
router.get("/search", protect, searchUsers);
router.get("/start/:userId", protect, getOrCreateConversation);

// Routes với params ở sau
router.get("/:receiverId", protect, getMessages);
router.get("/", protect, getConversations);

module.exports = router;
