const express = require("express");
const router = express.Router();
const interestController = require("../controllers/interest.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { requireAdmin } = require("../middlewares/requireAdmin");

// Public routes - Lấy danh sách sở thích
router.get("/", interestController.getAllInterests);

// Protected routes - Người dùng quản lý sở thích của mình (phải đặt trước /:id)
router.get("/me/interests", authMiddleware, interestController.getMyInterests);
router.put(
  "/me/interests",
  authMiddleware,
  interestController.updateMyInterests,
);

// Lấy sở thích của người dùng khác (phải đặt trước /:id)
router.get("/user/:userId", interestController.getUserInterests);

// Admin routes - Quản lý danh mục sở thích
router.post(
  "/",
  authMiddleware,
  requireAdmin,
  interestController.createInterest,
);
router.put(
  "/:id",
  authMiddleware,
  requireAdmin,
  interestController.updateInterest,
);
router.delete(
  "/:id",
  authMiddleware,
  requireAdmin,
  interestController.deleteInterest,
);

// Public - Lấy chi tiết 1 interest (phải đặt cuối cùng)
router.get("/:id", interestController.getInterestById);

module.exports = router;
