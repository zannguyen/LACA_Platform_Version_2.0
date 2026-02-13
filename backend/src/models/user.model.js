const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  fullname: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  isActive: {
    type: Boolean,
    default: false,
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  deletedAt: { type: Date, default: null },
  suspendUntil: { type: Date, default: null },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  avatar: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      default: "",
      maxlength: 200,
    },

});

module.exports = mongoose.model("User", userSchema);

userSchema.statics.findByIdAndUpdate = async function (
  userId,
  updateData,
  options = {},
) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid userId");
  }

  const user = await this.findById(userId);
  if (!user) {
    return null;
  }

  Object.keys(updateData).forEach((key) => {
    user[key] = updateData[key];
  });

  user.updatedAt = new Date();

  await user.save();

  return options.new ? user : null;
};

module.exports = mongoose.model("User", userSchema);
