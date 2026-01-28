const User = require("../models/user.model");
const bcrypt = require("bcryptjs");
const EmailOTP = require("../models/emailOTP.model");
const AppError = require("../utils/appError");
const emailService = require("./email.service");
const { randomUUID } = require("crypto");

const {
  USERNAME_LENGTH_MIN,
  USERNAME_LENGTH_MAX,
  PASSWORD_LENGTH_MIN,
  PASSWORD_LENGTH_MAX,
} = process.env;

console.log("emailService exports:", Object.keys(emailService));

exports.checkEmail = async (email) => {
  const user = await User.findOne({ email });
  return !!user;
};

exports.checkUsername = async (username) => {
  const user = await User.findOne({ username });
  return !!user;
};

exports.checkUsernameLength = async (username) => {
  if (
    username.length < Number(USERNAME_LENGTH_MIN) ||
    username.length > Number(USERNAME_LENGTH_MAX)
  ) {
    return false;
  }
  return true;
};

exports.checkPasswordLength = async (password) => {
  if (
    password.length < Number(PASSWORD_LENGTH_MIN) ||
    password.length > Number(PASSWORD_LENGTH_MAX)
  ) {
    return false;
  }
  return true;
};

exports.comparePassword = async (password, confirmPassword) => {
  return password === confirmPassword;
};

exports.generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

exports.generateOTPExpiredAt = () => {
  return new Date(Date.now() + Number(process.env.OTP_EXPIRED_IN));
};

exports.verifyRegister = async (
  fullname,
  username,
  email,
  password,
  confirmPassword,
) => {
  if (!email || !password || !username || !fullname || !confirmPassword) {
    throw new AppError("Bad request", 400);
  }

  const isUsernameLengthValid = await exports.checkUsernameLength(username);
  if (!isUsernameLengthValid) {
    throw new AppError(
      `Username must be between ${USERNAME_LENGTH_MIN} and ${USERNAME_LENGTH_MAX} characters`,
      400,
    );
  }

  const isEmailExists = await exports.checkEmail(email);
  if (isEmailExists) throw new AppError("Email already exists", 400);

  const isUsernameExists = await exports.checkUsername(username);
  if (isUsernameExists) throw new AppError("Username already exists", 400);

  const isPasswordLengthValid = await exports.checkPasswordLength(password);
  if (!isPasswordLengthValid) {
    throw new AppError(
      `Password must be between ${PASSWORD_LENGTH_MIN} and ${PASSWORD_LENGTH_MAX} characters`,
      400,
    );
  }

  const isPasswordMatch = await exports.comparePassword(
    password,
    confirmPassword,
  );
  if (!isPasswordMatch) throw new AppError("Password does not match", 400);

  return true;
};

/**
 * ✅ Gửi OTP quên mật khẩu
 */
exports.forgotPassword = async (email) => {
  if (!email) throw new AppError("Email is required", 400);

  const user = await User.findOne({ email });
  if (!user) throw new AppError("Email does not exist", 400);

  // xoá OTP reset cũ
  await EmailOTP.deleteMany({ userId: user._id, purpose: "RESET_PASSWORD" });

  const plainOtp = exports.generateOTP();
  const otpToken = randomUUID();

  await EmailOTP.create({
    otpToken,
    userId: user._id,
    otp: await bcrypt.hash(plainOtp, Number(process.env.SALT_ROUNDS)),
    purpose: "RESET_PASSWORD",
    expiresAt: exports.generateOTPExpiredAt(),
    isUsed: false,
    attempts: 0,
  });

  // ✅ FIX: giờ emailService có sendOTP
  await emailService.sendOTP(email, plainOtp, "RESET_PASSWORD");

  return { otpToken };
};

/**
 * ✅ Verify OTP quên mật khẩu (KHÔNG active user)
 */
exports.verifyResetOtp = async ({ otpToken, otpCode }) => {
  if (!otpToken || !otpCode) throw new AppError("Bad request", 400);

  const otpDoc = await EmailOTP.findOne({
    otpToken,
    purpose: "RESET_PASSWORD",
    isUsed: false,
  });

  if (!otpDoc) throw new AppError("otpToken does not match", 400);
  if (otpDoc.expiresAt.getTime() <= Date.now())
    throw new AppError("otpToken expired", 400);

  if ((otpDoc.attempts || 0) >= 5) {
    throw new AppError("OTP locked due to too many attempts", 429);
  }

  const ok = await bcrypt.compare(String(otpCode).trim(), otpDoc.otp);
  if (!ok) {
    otpDoc.attempts = (otpDoc.attempts || 0) + 1;
    await otpDoc.save();
    throw new AppError("Invalid OTP", 400);
  }

  return { userId: otpDoc.userId };
};

/**
 * ✅ Reset mật khẩu
 */
exports.resetPassword = async ({
  otpToken,
  otpCode,
  password,
  confirmPassword,
}) => {
  if (!otpToken || !otpCode || !password || !confirmPassword) {
    throw new AppError("Bad request", 400);
  }

  if (!(await exports.checkPasswordLength(password))) {
    throw new AppError(
      `Password must be between ${PASSWORD_LENGTH_MIN} and ${PASSWORD_LENGTH_MAX} characters`,
      400,
    );
  }

  if (password !== confirmPassword)
    throw new AppError("Password does not match", 400);

  const { userId } = await exports.verifyResetOtp({ otpToken, otpCode });

  await User.findByIdAndUpdate(userId, {
    password: await bcrypt.hash(password, Number(process.env.SALT_ROUNDS)),
    updatedAt: Date.now(),
  });

  await EmailOTP.updateOne(
    { otpToken, purpose: "RESET_PASSWORD" },
    { $set: { isUsed: true } },
  );

  return true;
};
