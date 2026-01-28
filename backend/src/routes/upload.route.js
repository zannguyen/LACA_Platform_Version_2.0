const router = require("express").Router();
const upload = require("../middlewares/upload.middleware");

router.post("/", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    res.json({
      url: req.file.path,
      secure_url: req.file.secure_url,
      originalname: req.file.originalname,
    });
  } catch (error) {
    console.log("UPLOAD ERROR RAW:", error);
    console.log("UPLOAD ERROR MESSAGE:", error.message);
    console.log("UPLOAD ERROR STACK:", error.stack);

    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
