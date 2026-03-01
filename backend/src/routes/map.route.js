const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/auth.middleware");
const geoValidate = require("../middlewares/geoValidator.middleware");
const mapController = require("../controllers/map.controller");

// Nếu bạn muốn hotspots public: chuyển route hotspots lên trước router.use(authMiddleware)
// hoặc dùng optionalAuth.middleware
router.use(authMiddleware);

// Nearby posts (radius mặc định = 5km trong service, route không yêu cầu radius)
router.get(
  "/posts/nearby",
  geoValidate({ requireRadius: false, maxRadiusKm: 5, defaultRadiusKm: 5 }),
  mapController.getPostsInRadius,
);

// Click point (không cần radius)
router.get(
  "/posts/at-point",
  geoValidate({ requireRadius: false }),
  mapController.getPostsAtPoint,
);

// Density (cần radius)
router.get(
  "/posts/density",
  geoValidate({ requireRadius: true, maxRadiusKm: 5, defaultRadiusKm: 5 }),
  mapController.getPostDensity,
);

// Hotspots (cần radius, trả thumb + weight)
router.get(
  "/posts/hotspots",
  geoValidate({ requireRadius: true, maxRadiusKm: 10, defaultRadiusKm: 5 }),
  mapController.getPostHotspots,
);

module.exports = router;
