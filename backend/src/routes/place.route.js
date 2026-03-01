// src/routes/place.route.js
const express = require("express");
const router = express.Router();

const placeController = require("../controllers/place.controller");

// GET /api/places/suggest?lat&lng&radius&limit&query
router.get("/suggest", placeController.suggestPlaces);

// GET /api/places/reverse?lat&lng
router.get("/reverse", placeController.reverseGeocode);

// POST /api/places/resolve
router.post("/resolve", placeController.resolvePlace);

module.exports = router;
