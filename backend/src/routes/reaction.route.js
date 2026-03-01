const router = require("express").Router();
const controller = require("../controllers/reaction.controller");
const auth = require("../middlewares/auth.middleware");

router.post("/", auth, controller.react);
router.delete("/:postId", auth, controller.unreact);
router.get("/count/:postId", controller.count);
router.get("/status/:postId", auth, controller.getReactionStatus);

module.exports = router;
