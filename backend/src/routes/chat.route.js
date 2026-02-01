const express = require('express');
const router = express.Router();
const { sendMessage, getMessages, getConversations } = require('../controllers/chat.controller');
const protect = require('../middlewares/auth.middleware');

// Apply protect middleware cho tất cả routes
router.post('/send', protect, sendMessage);
router.get('/:receiverId', protect, getMessages);
router.get('/', protect, getConversations);

module.exports = router;

module.exports = router;