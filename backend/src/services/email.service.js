const sendEmail = require("../utils/mailer");
const bcrypt = require("bcryptjs");
const AppError = require("../utils/appError");
const OTP = require("../models/emailOTP.model");
const User = require("../models/user.model");

console.log("LOADED email.service.js FROM:", __filename);

/**
 * ✅ Send OTP chung cho REGISTER / RESET_PASSWORD
 */
exports.sendOTP = async (email, otp, purpose) => {
  const contentMap = {
    REGISTER: "verify your account",
    RESET_PASSWORD: "reset your password",
  };

  const subject =
    purpose === "RESET_PASSWORD"
      ? "Password Reset Verification Code"
      : "Account Registration Verification Code";

  const html = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; padding: 24px; background-color: #ffffff;">
    <h2 style="color: #4CAF50; text-align: center; margin-bottom: 20px;">
      Verification Code
    </h2>
    <p>Hello,</p>
    <p>Use the following OTP to ${contentMap[purpose] || "verify"}:</p>

    <div style="text-align: center; margin: 24px 0;">
      <span style="
        display: inline-block;
        font-size: 28px;
        font-weight: bold;
        color: #ff5722;
        letter-spacing: 4px;
        padding: 12px 24px;
        border: 1px dashed #ff5722;
        border-radius: 6px;
      ">
        ${otp}
      </span>
    </div>

    <p>
      This code will expire in <strong>${Number(process.env.OTP_EXPIRED_IN) / 60 / 1000} minutes</strong>.
    </p>

    <p style="color: #666;">
      If you did not request this, please ignore.
    </p>

    <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />

    <p style="font-size: 12px; color: #999; text-align: center;">
      This is an automated message. Please do not reply.
    </p>
  </div>
  `;

  await sendEmail({ email, subject, html });
};

/**
 * ✅ Wrapper tương thích code cũ (register đang gọi sendOTPRegister)
 */
exports.sendOTPRegister = async (email, otp) => {
  return exports.sendOTP(email, otp, "REGISTER");
};

/**
 * ✅ Verify OTP chung
 * - purpose=REGISTER: active user + verify email
 * - purpose=RESET_PASSWORD: chỉ verify OTP (không active user)
 */
exports.verifyOTP = async ({ otpToken, otpCode, purpose }) => {
  const otp = await OTP.findOne({ otpToken });

  if (!otp) throw new AppError("OTP not found", 400);
  if (otp.isUsed) throw new AppError("OTP already used", 400);
  if (new Date(otp.expiresAt) < new Date())
    throw new AppError("OTP expired", 400);

  if ((otp.attempts || 0) >= 5) {
    throw new AppError("OTP locked due to too many attempts", 429);
  }

  // check purpose khớp
  if (purpose && otp.purpose !== purpose) {
    throw new AppError("OTP purpose mismatch", 400);
  }

  const isMatch = await bcrypt.compare(String(otpCode).trim(), otp.otp);
  if (!isMatch) {
    otp.attempts = (otp.attempts || 0) + 1;
    await otp.save();
    throw new AppError("Invalid OTP", 400);
  }

  // ✅ REGISTER thì active user
  if (purpose === "REGISTER") {
    const user = await User.findByIdAndUpdate(
      otp.userId,
      { isEmailVerified: true, isActive: true },
      { new: true },
    );

    if (!user) throw new AppError("User không tồn tại", 404);
  }

  // mark used
  otp.isUsed = true;
  await otp.save();

  return { userId: otp.userId, purpose: otp.purpose };
};
