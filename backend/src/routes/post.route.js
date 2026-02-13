const router = require("express").Router();
const controller = require("../controllers/post.controller");
const auth = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");

// Post thường (JSON) - giữ nguyên nếu bạn vẫn muốn dùng
router.post("/", auth, controller.create);

// ✅ Post gộp: upload file + create post
// FE gửi form-data:
// - field text: content, type, placeId
// - field file: files (1 hoặc nhiều)
router.post(
  "/with-media",
  auth,
  upload.array("files", 10), // tối đa 10 file
  controller.createWithMedia,
);

router.get("/home", auth, controller.getHomePosts);

module.exports = router;
