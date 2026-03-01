const mongoose = require("mongoose");

const defaultProfileVisibility = {
  fullname: true,
  avatar: true,
  bio: true,
  email: false,
  phoneNumber: false,
  dateOfBirth: false,
};

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
<<<<<<< HEAD
  phoneNumber: {
    type: String,
    default: "",
    maxlength: 20,
  },
  dateOfBirth: {
    type: Date,
    default: null,
  },
  profileVisibility: {
    fullname: { type: Boolean, default: defaultProfileVisibility.fullname },
    avatar: { type: Boolean, default: defaultProfileVisibility.avatar },
    bio: { type: Boolean, default: defaultProfileVisibility.bio },
    email: { type: Boolean, default: defaultProfileVisibility.email },
    phoneNumber: {
      type: Boolean,
      default: defaultProfileVisibility.phoneNumber,
    },
    dateOfBirth: {
      type: Boolean,
      default: defaultProfileVisibility.dateOfBirth,
    },
  },
=======
>>>>>>> 35abd7ff928f681dd73c98791f17bcc19dce34f9
  interests: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Interest",
    },
  ],
  preferredTags: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tag",
    },
  ],
});

const User = mongoose.model("User", userSchema);

<<<<<<< HEAD
module.exports = User;
=======
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
>>>>>>> 35abd7ff928f681dd73c98791f17bcc19dce34f9
