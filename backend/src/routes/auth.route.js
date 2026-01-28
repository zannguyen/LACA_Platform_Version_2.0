const express = require("express");
const router = express.Router();

const controller = require("../controllers/auth.controller");

// signup/login
router.post("/register", controller.register);
router.post("/verify-otp", controller.verifyOtp);
router.post("/login", controller.login);

// forgot password
router.post("/forgot-password", controller.forgotPassword);
router.post("/forgot-password/verify-otp", controller.verifyForgotPasswordOtp);
router.post("/reset-password", controller.resetPassword);

module.exports = router;
