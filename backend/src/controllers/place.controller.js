// src/controllers/place.controller.js
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/appError");

const placeService = require("../services/place.service");

const toNum = (v) => (v === undefined || v === null ? NaN : Number(v));

exports.suggestPlaces = asyncHandler(async (req, res, next) => {
  const lat = toNum(req.query.lat);
  const lng = toNum(req.query.lng);
  const radius = Math.max(10, Math.min(Number(req.query.radius || 250), 5000));
  const limit = Math.max(1, Math.min(Number(req.query.limit || 12), 50));
  const query = String(req.query.query || "").trim();

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return next(new AppError("lat/lng is required", 400));
  }

  const result = await placeService.suggestPlaces({
    lat,
    lng,
    radius,
    limit,
    query,
  });
  return res.status(200).json(result); // {success,count,data:[...]}
});

exports.reverseGeocode = asyncHandler(async (req, res, next) => {
  const lat = toNum(req.query.lat);
  const lng = toNum(req.query.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return next(new AppError("lat/lng is required", 400));
  }

  const result = await placeService.reverseGeocode({ lat, lng });
  return res.status(200).json(result); // {success,data:{name,address,raw}}
});

exports.resolvePlace = asyncHandler(async (req, res, next) => {
  const lat = toNum(req.body.lat ?? req.body.latitude);
  const lng = toNum(req.body.lng ?? req.body.longitude);

  const name = (req.body.name || "").trim();
  const address = (req.body.address || "").trim();
  const category = (req.body.category || "other").trim();
  const googlePlaceId = (req.body.googlePlaceId || "").trim();
  const forceCreate = req.body.forceCreate === true;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return next(new AppError("lat/lng is required", 400));
  }

  const result = await placeService.resolvePlace({
    lat,
    lng,
    name,
    address,
    category,
    googlePlaceId: googlePlaceId || undefined,
    forceCreate,
  });

  return res.status(200).json(result); // {success,data:PlaceDoc}
});
