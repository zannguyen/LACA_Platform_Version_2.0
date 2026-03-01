const AppError = require("../utils/appError");

module.exports = ({
  requireRadius = true,
  maxRadiusKm = 10,
  defaultRadiusKm = null,
} = {}) => {
  return (req, res, next) => {
    const { lng, lat, radius } = req.query;

    if (lng === undefined || lat === undefined) {
      return next(new AppError("lng and lat are required", 400));
    }

    const lngNum = Number(lng);
    const latNum = Number(lat);

    if (Number.isNaN(lngNum) || Number.isNaN(latNum)) {
      return next(new AppError("lng and lat must be numbers", 400));
    }

    if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      return next(new AppError("Invalid latitude or longitude range", 400));
    }

    // ===== XỬ LÝ RADIUS =====
    let finalRadiusKm;

    if (requireRadius) {
      if (radius === undefined && defaultRadiusKm === null) {
        return next(new AppError("radius is required", 400));
      }

      finalRadiusKm = radius !== undefined ? Number(radius) : defaultRadiusKm;

      if (Number.isNaN(finalRadiusKm)) {
        return next(new AppError("radius must be a number", 400));
      }

      if (finalRadiusKm <= 0 || finalRadiusKm > maxRadiusKm) {
        return next(
          new AppError(`radius must be between 0 and ${maxRadiusKm} km`, 400),
        );
      }
    }

    req.geo = {
      lng: lngNum,
      lat: latNum,
      ...(requireRadius && {
        radiusKm: finalRadiusKm,
        radiusMeters: finalRadiusKm * 1000,
      }),
    };

    next();
  };
};
