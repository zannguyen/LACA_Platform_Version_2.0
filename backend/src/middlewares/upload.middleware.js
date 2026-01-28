const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    // tự nhận dạng loại file: image/video
    const isVideo = file.mimetype?.startsWith("video/");
    return {
      folder: "laca_uploads",
      resource_type: "auto",
      allowed_formats: ["jpg", "png", "jpeg", "webp", "mp4", "webm", "mov"],
      // gợi ý format cho video
      format: isVideo ? "mp4" : undefined,
    };
  },
});

const upload = multer({ storage });

module.exports = upload;
