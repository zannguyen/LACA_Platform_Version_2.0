require("dotenv").config();
const bcrypt = require("bcryptjs");
const User = require("../models/user.model");
const EmailOTP = require("../models/emailOTP.model");
const jwtUtil = require("../utils/jwt");
const authService = require("../services/auth.service");
const { randomUUID } = require("crypto");
const { setRefreshTokenCookie } = require("../utils/cookie");
const emailService = require("../services/email.service");
const RefreshToken = require("../models/refreshToken.model");

const {
  USERNAME_LENGTH_MIN,
  USERNAME_LENGTH_MAX,
  PASSWORD_LENGTH_MIN,
  PASSWORD_LENGTH_MAX,
} = process.env;

exports.register = async (req, res) => {
  try {
    const { fullname, username, email, password, confirmPassword } = req.body;

    if (!fullname || !username || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: "Bad request" });
    }

    if (!(await authService.checkUsernameLength(username))) {
      return res.status(400).json({
        message: `Username must be between ${USERNAME_LENGTH_MIN} and ${USERNAME_LENGTH_MAX} characters`,
      });
    }

    if (await authService.checkEmail(email)) {
      return res.status(400).json({ message: "Email already exists" });
    }

    if (await authService.checkUsername(username)) {
      return res.status(400).json({ message: "Username already exists" });
    }

    if (!(await authService.checkPasswordLength(password))) {
      return res.status(400).json({
        message: `Password must be between ${PASSWORD_LENGTH_MIN} and ${PASSWORD_LENGTH_MAX} characters`,
      });
    }

    if (!(await authService.comparePassword(password, confirmPassword))) {
      return res.status(400).json({ message: "Password does not match" });
    }

    const hashedPassword = await bcrypt.hash(
      password,
      Number(process.env.SALT_ROUNDS),
    );

    const user = await User.create({
      fullname,
      username,
      email,
      password: hashedPassword,
      isActive: false,
      isEmailVerified: false,
    });

    const plainOTP = authService.generateOTP();
    const hashedOTP = await bcrypt.hash(
      plainOTP,
      Number(process.env.SALT_ROUNDS),
    );

    // ✅ THÊM purpose: "REGISTER" để không bị purpose=null
    const otp = await EmailOTP.create({
      otpToken: randomUUID(),
      userId: user._id,
      otp: hashedOTP,
      purpose: "REGISTER",
      expiresAt: authService.generateOTPExpiredAt(),
      isUsed: false,
      attempts: 0,
    });

    // dùng hàm sendOTP chung (nếu bạn có sendOTPRegister thì cứ giữ)
    await emailService.sendOTP(user.email, plainOTP, "REGISTER");

    return res.status(201).json({
      success: true,
      message: "OTP has been sent to your email",
      data: {
        otpToken: otp.otpToken,
        expiresAt: otp.expiresAt,
      },
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { otpToken, otpCode } = req.body;

    if (!otpToken || !otpCode) {
      return res.status(400).json({
        message: "otpToken and otpCode are required",
      });
    }

    const { userId } = await emailService.verifyOTP({
      otpToken,
      otpCode,
      purpose: "REGISTER",
    });

    const accessToken = jwtUtil.generateAccessToken(userId);
    const refreshToken = jwtUtil.generateRefreshToken(userId);

    const tokenHash = await bcrypt.hash(
      refreshToken,
      Number(process.env.SALT_ROUNDS),
    );

    await RefreshToken.create({
      userId,
      token: tokenHash,
      userAgent: req.headers["user-agent"] || "unknown",
      ipAddress: req.ip,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isRevoked: false,
    });

    setRefreshTokenCookie(res, refreshToken);

    return res.status(200).json({
      success: true,
      message: "OTP validation success",
      data: { accessToken },
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Bad request" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ message: "Invalid credentials" });

    // (tuỳ bạn) chặn user chưa verify email
    if (user.isEmailVerified === false) {
      return res.status(403).json({ message: "Email not verified" });
    }

    const accessToken = jwtUtil.generateAccessToken(user._id);
    const refreshToken = jwtUtil.generateRefreshToken(user._id);

    const tokenHash = await bcrypt.hash(
      refreshToken,
      Number(process.env.SALT_ROUNDS),
    );

    await RefreshToken.create({
      userId: user._id,
      token: tokenHash,
      userAgent: req.headers["user-agent"] || "unknown",
      ipAddress: req.ip,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isRevoked: false,
    });

    setRefreshTokenCookie(res, refreshToken);

    return res.status(200).json({
      success: true,
      message: "Login success",
      accessToken, // ✅ frontend đang đọc data.accessToken
      user: {
        _id: user._id,
        fullname: user.fullname,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ===== FORGOT PASSWORD =====
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const data = await authService.forgotPassword(email); // { otpToken }
    return res.status(200).json({
      success: true,
      message: "OTP has been sent to your email",
      data,
    });
  } catch (error) {
    console.error("FORGOT PASSWORD ERROR:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

exports.verifyForgotPasswordOtp = async (req, res) => {
  try {
    const { otpToken, otpCode } = req.body;
    await authService.verifyResetOtp({ otpToken, otpCode });
    return res.status(200).json({
      success: true,
      message: "OTP is valid",
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { otpToken, otpCode, password, confirmPassword } = req.body;

    await authService.resetPassword({
      otpToken,
      otpCode,
      password,
      confirmPassword,
    });

    return res.status(200).json({
      success: true,
      message: "Password reset successful",
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
