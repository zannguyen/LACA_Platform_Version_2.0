const router = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const optionalAuth = require("../middlewares/optionalAuth.middleware");
const controller = require("../controllers/user.controller");

// My profile (Auth)
router.get("/me/profile", auth, controller.getMyProfile);
router.put("/me/profile", auth, controller.updateMyProfile);

// Public profile (by id)
router.get("/:userId/profile", optionalAuth, controller.getUserProfile);

// Block/Unblock (Auth)
router.post("/:id/block", auth, controller.blockUser);
router.delete("/:id/block", auth, controller.unblockUser);

// Follow/Unfollow (Auth)
router.post("/:id/follow", auth, controller.followUser);
router.delete("/:id/follow", auth, controller.unfollowUser);
router.get("/:id/follow-status", auth, controller.getFollowStatus);

module.exports = router;
