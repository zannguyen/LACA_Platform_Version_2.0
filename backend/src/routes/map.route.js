const express = require("express");
const router = express.Router();

const geoValidate = require("../middlewares/geoValidator.middleware");
const mapController = require("../controllers/map.controller");
router.get(
  "/posts/nearby",
  geoValidate({
    requireRadius: false,
    maxRadiusKm: 5,
    defaultRadiusKm: 5,
  }),
  mapController.getPostsInRadius,
);

router.get(
  "/posts/at-point",
  geoValidate({ requireRadius: false }),
  mapController.getPostsAtPoint,
);

// router.get(
//   "/posts/density",
//   geoValidate({ requireRadius: true, maxRadiusKm: 5 }),
//   mapController.getPostDensity,
// );

module.exports = router;
