const express = require("express");
const router = express.Router();
const chatbotController = require("../controllers/chatbot.controller");

// Public route - chatbot message
router.post("/message", chatbotController.handleMessage);

module.exports = router;
