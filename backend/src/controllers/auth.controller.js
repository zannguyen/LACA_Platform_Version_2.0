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

// helper: check user status (5 trạng thái)
const assertUserCanLogin = (user) => {
  if (!user) return { ok: false, status: 400, message: "Invalid credentials" };

  // deleted
  if (user.deletedAt) {
    return { ok: false, status: 403, message: "Account deleted" };
  }

  // suspended
  if (user.suspendUntil && new Date(user.suspendUntil).getTime() > Date.now()) {
    return {
      ok: false,
      status: 403,
      message: "Account suspended",
      extra: { suspendUntil: user.suspendUntil },
    };
  }

  // blocked
  if (user.isActive === false) {
    return { ok: false, status: 403, message: "Account blocked" };
  }

  // unverified
  if (user.isEmailVerified === false) {
    return { ok: false, status: 403, message: "Email not verified" };
  }

  return { ok: true };
};

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

    // ✅ mặc định: chưa verify => isEmailVerified=false
    // ✅ isActive=false để bắt buộc verify OTP xong mới active
    const user = await User.create({
      fullname,
      username,
      email,
      password: hashedPassword,
      isActive: false,
      isEmailVerified: false,
      deletedAt: null, // nếu schema có
      suspendUntil: null, // nếu schema có
    });

    const plainOTP = authService.generateOTP();
    const hashedOTP = await bcrypt.hash(
      plainOTP,
      Number(process.env.SALT_ROUNDS),
    );

    const otp = await EmailOTP.create({
      otpToken: randomUUID(),
      userId: user._id,
      otp: hashedOTP,
      purpose: "REGISTER",
      expiresAt: authService.generateOTPExpiredAt(),
      isUsed: false,
      attempts: 0,
    });

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

    // ✅ LẤY USER + CHẶN deleted/suspended trước khi phát token
    let user = await User.findById(userId).select(
      "fullname username email role isActive isEmailVerified deletedAt suspendUntil",
    );

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (user.deletedAt) {
      return res
        .status(403)
        .json({ success: false, message: "Account deleted" });
    }

    if (user.suspendUntil && user.suspendUntil.getTime() > Date.now()) {
      return res.status(403).json({
        success: false,
        message: "Account suspended",
        suspendUntil: user.suspendUntil,
      });
    }

    // ✅ Sau khi verify OTP: bật verified + active
    // (Nếu bạn muốn admin duyệt thủ công thì bỏ isActive:true)
    user.isEmailVerified = true;
    user.isActive = true;
    await user.save();

    // ✅ phát token
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

    // ✅ lấy thêm các field status để check
    const user = await User.findOne({ email }).select(
      "fullname username email password role isActive isEmailVerified deletedAt suspendUntil",
    );

    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ message: "Invalid credentials" });

    // ✅ chặn theo 5 trạng thái
    const check = assertUserCanLogin(user);
    if (!check.ok) {
      return res.status(check.status).json({
        success: false,
        message: check.message,
        ...(check.extra ? check.extra : {}),
      });
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
      accessToken,
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
    const data = await authService.forgotPassword(email);
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
