const router = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const optionalAuth = require("../middlewares/optionalAuth.middleware");
const controller = require("../controllers/user.controller");

// My profile (Auth)
router.get("/me/profile", auth, controller.getMyProfile);
router.put("/me/profile", auth, controller.updateMyProfile);
<<<<<<< HEAD
router.get("/me/account-settings", auth, controller.getMyAccountSettings);
router.put("/me/account-settings", auth, controller.updateMyAccountSettings);
=======
>>>>>>> 35abd7ff928f681dd73c98791f17bcc19dce34f9

// Preferred tags (sở thích)
router.get("/me/preferred-tags", auth, controller.getMyPreferredTags);
router.put("/me/preferred-tags", auth, controller.updateMyPreferredTags);
router.get("/:userId/preferred-tags", controller.getUserPreferredTags);

// Public profile (by id)
router.get("/:userId/profile", optionalAuth, controller.getUserProfile);

// Block/Unblock (Auth)
router.get("/blocked", auth, controller.getBlockedUsers);
router.post("/:id/block", auth, controller.blockUser);
router.delete("/:id/block", auth, controller.unblockUser);

// Follow/Unfollow (Auth)
router.post("/:id/follow", auth, controller.followUser);
router.delete("/:id/follow", auth, controller.unfollowUser);
router.get("/:id/follow-status", auth, controller.getFollowStatus);

module.exports = router;
