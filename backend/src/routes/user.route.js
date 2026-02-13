const router = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const controller = require("../controllers/user.controller");

// My profile (Auth)
router.get("/me/profile", auth, controller.getMyProfile);
router.put("/me/profile", auth, controller.updateMyProfile);

// Public profile (by id)
router.get("/:userId/profile", controller.getUserProfile);

// Block/Unblock (Auth)
router.post("/:id/block", auth, controller.blockUser);
router.delete("/:id/block", auth, controller.unblockUser);

module.exports = router;
