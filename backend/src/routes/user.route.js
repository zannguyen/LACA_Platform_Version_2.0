const router = require("express").Router();
const authMiddleware = require("../middlewares/auth.middleware");
const controller = require("../controllers/user.controller");

router.use(authMiddleware);

router.post("/:id/block", controller.blockUser);
router.delete("/:id/block", controller.unblockUser);

module.exports = router;
