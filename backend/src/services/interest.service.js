const Interest = require("../models/interest.model");
const User = require("../models/user.model");
const AppError = require("../utils/appError");

class InterestService {
  // Lấy tất cả sở thích có sẵn
  async getAllInterests() {
    const interests = await Interest.find({ isActive: true }).sort({ name: 1 });
    return interests;
  }

  // Lấy sở thích theo ID
  async getInterestById(interestId) {
    const interest = await Interest.findById(interestId);
    if (!interest) {
      throw new AppError("Interest not found", 404);
    }
    return interest;
  }

  // Thêm sở thích mới (admin)
  async createInterest(data) {
    const existingInterest = await Interest.findOne({ name: data.name });
    if (existingInterest) {
      throw new AppError("Interest already exists", 400);
    }

    const interest = await Interest.create(data);
    return interest;
  }

  // Cập nhật sở thích (admin)
  async updateInterest(interestId, data) {
    const interest = await Interest.findByIdAndUpdate(
      interestId,
      { ...data, updatedAt: Date.now() },
      { new: true, runValidators: true },
    );

    if (!interest) {
      throw new AppError("Interest not found", 404);
    }

    return interest;
  }

  // Xóa sở thích (admin)
  async deleteInterest(interestId) {
    const interest = await Interest.findByIdAndDelete(interestId);
    if (!interest) {
      throw new AppError("Interest not found", 404);
    }

    // Xóa sở thích này khỏi tất cả người dùng
    await User.updateMany(
      { interests: interestId },
      { $pull: { interests: interestId } },
    );

    return { message: "Interest deleted successfully" };
  }

  // Cập nhật tất cả sở thích của người dùng (ghi đè)
  async updateUserInterests(userId, interestIds) {
    // Kiểm tra các sở thích có tồn tại không
    const interests = await Interest.find({
      _id: { $in: interestIds },
      isActive: true,
    });

    if (interests.length !== interestIds.length) {
      throw new AppError("Some interests are invalid", 400);
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        interests: interestIds,
        updatedAt: Date.now(),
      },
      { new: true },
    ).populate("interests");

    if (!user) {
      throw new AppError("User not found", 404);
    }

    return user.interests;
  }

  // Lấy sở thích của người dùng
  async getUserInterests(userId) {
    const user = await User.findById(userId).populate("interests");
    if (!user) {
      throw new AppError("User not found", 404);
    }

    return user.interests;
  }
}

module.exports = new InterestService();
