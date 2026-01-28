const router = require("express").Router();
const controller = require("../controllers/reaction.controller");
const auth = require("../middlewares/auth.middleware");

router.post("/", auth, controller.react);
router.get("/count/:postId", controller.count);

module.exports = router;
