require("dotenv").config();
const jwt = require("jsonwebtoken");
const {
  JWT_OTP_SECRET,
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN,
  OTP_EXPIRED_IN,
} = process.env;

exports.generateOTPToken = (userID, otpID) => {
  return jwt.sign({ userID, otpID }, JWT_OTP_SECRET, {
    expiresIn: OTP_EXPIRED_IN,
  });
};

exports.verifyOTPToken = (token) => {
  return jwt.verify(token, JWT_OTP_SECRET);
};

exports.generateAccessToken = (userID) => {
  return jwt.sign({ userID }, JWT_ACCESS_SECRET, {
    expiresIn: JWT_ACCESS_EXPIRES_IN,
  });
};

exports.generateRefreshToken = (userID) => {
  return jwt.sign({ userID }, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  });
};

exports.verifyAccessToken = (token) => {
  return jwt.verify(token, JWT_ACCESS_SECRET);
};

exports.verifyRefreshToken = (token) => {
  return jwt.verify(token, JWT_REFRESH_SECRET);
};
