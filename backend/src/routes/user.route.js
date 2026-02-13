const router = require("express").Router();

const auth = require("../middlewares/auth.middleware");
const userController = require("../controllers/user.controller");

// router.post("/user/:id/block", require("../controllers/user.controller"));
// My profile
router.get("/me/profile", auth, userController.getMyProfile);
router.put("/me/profile", auth, userController.updateMyProfile);

// Public profile (by id)
router.get("/:userId/profile", userController.getUserProfile);


module.exports = router;
