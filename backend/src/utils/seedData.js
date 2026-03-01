const mongoose = require("mongoose");
require("dotenv").config();
const User = require("../models/user.model");
const Feedback = require("../models/feedback.model");
const Conversation = require("../models/conversation.model");
const Message = require("../models/message.model");

// Kết nối MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

// Tạo test data cho Feedbacks
const seedFeedbacks = async () => {
  try {
    // Lấy một user bất kỳ
    const users = await User.find().limit(3);

    if (users.length === 0) {
      console.log("Không có user nào trong database. Vui lòng tạo user trước.");
      return;
    }

    const feedbacks = [
      {
        userId: users[0]._id,
        content: "Ứng dụng rất tuyệt vời! Giao diện đẹp và dễ sử dụng.",
        type: "feedback",
        status: "new",
      },
      {
        userId: users[1] ? users[1]._id : users[0]._id,
        content: "Nên thêm tính năng dark mode để bảo vệ mắt người dùng.",
        type: "feedback",
        status: "read",
      },
      {
        userId: users[2] ? users[2]._id : users[0]._id,
        content: "Phát hiện lỗi khi upload ảnh quá 10MB, app bị crash.",
        type: "report",
        status: "new",
      },
      {
        content:
          "Góp ý ẩn danh: Nên có thêm tính năng lọc nội dung không phù hợp.",
        type: "feedback",
        status: "new",
      },
      {
        userId: users[0]._id,
        content: "Thông báo đẩy không hoạt động trên iOS 17.",
        type: "report",
        status: "resolved",
      },
    ];

    await Feedback.insertMany(feedbacks);
    console.log("✅ Đã tạo 5 feedbacks test data");
  } catch (error) {
    console.error("❌ Lỗi khi seed feedbacks:", error);
  }
};

// Tạo test data cho Conversations và Messages
const seedConversations = async () => {
  try {
    const users = await User.find().limit(4);

    if (users.length < 2) {
      console.log(
        "Cần ít nhất 2 users để tạo conversations. Hiện có:",
        users.length,
      );
      return;
    }

    // Tạo conversation 1: User 0 và User 1
    const conversation1 = await Conversation.create({
      participants: [users[0]._id, users[1]._id],
    });

    // Tạo messages cho conversation 1
    const messages1 = [
      {
        conversationId: conversation1._id,
        senderId: users[0]._id,
        text: "Chào bạn! Bạn khỏe không?",
        isRead: true,
      },
      {
        conversationId: conversation1._id,
        senderId: users[1]._id,
        text: "Mình khỏe, cảm ơn bạn! Bạn thì sao?",
        isRead: true,
      },
      {
        conversationId: conversation1._id,
        senderId: users[0]._id,
        text: "Mình cũng ổn. Hôm nay bạn có rảnh không?",
        isRead: false,
      },
    ];

    await Message.insertMany(messages1);

    // Cập nhật lastMessage cho conversation 1
    const lastMsg1 = messages1[messages1.length - 1];
    conversation1.lastMessage = {
      text: lastMsg1.text,
      sender: lastMsg1.senderId,
      isRead: lastMsg1.isRead,
      createdAt: new Date(),
    };
    await conversation1.save();

    console.log("✅ Đã tạo conversation 1 với 3 messages");

    // Tạo conversation 2 nếu có đủ users
    if (users.length >= 3) {
      const conversation2 = await Conversation.create({
        participants: [users[0]._id, users[2]._id],
      });

      const messages2 = [
        {
          conversationId: conversation2._id,
          senderId: users[2]._id,
          text: "Hey! Bạn đã thử tính năng mới chưa?",
          isRead: true,
        },
        {
          conversationId: conversation2._id,
          senderId: users[0]._id,
          text: "Rồi, rất tuyệt luôn! 😊",
          isRead: false,
        },
      ];

      await Message.insertMany(messages2);

      const lastMsg2 = messages2[messages2.length - 1];
      conversation2.lastMessage = {
        text: lastMsg2.text,
        sender: lastMsg2.senderId,
        isRead: lastMsg2.isRead,
        createdAt: new Date(),
      };
      await conversation2.save();

      console.log("✅ Đã tạo conversation 2 với 2 messages");
    }

    // Tạo conversation 3 nếu có đủ users
    if (users.length >= 4) {
      const conversation3 = await Conversation.create({
        participants: [users[1]._id, users[3]._id],
      });

      const messages3 = [
        {
          conversationId: conversation3._id,
          senderId: users[1]._id,
          text: "Xin chào! Rất vui được làm quen.",
          isRead: false,
        },
      ];

      await Message.insertMany(messages3);

      const lastMsg3 = messages3[0];
      conversation3.lastMessage = {
        text: lastMsg3.text,
        sender: lastMsg3.senderId,
        isRead: lastMsg3.isRead,
        createdAt: new Date(),
      };
      await conversation3.save();

      console.log("✅ Đã tạo conversation 3 với 1 message");
    }
  } catch (error) {
    console.error("❌ Lỗi khi seed conversations:", error);
  }
};

// Xóa dữ liệu cũ (optional)
const clearData = async () => {
  try {
    await Feedback.deleteMany({});
    await Message.deleteMany({});
    await Conversation.deleteMany({});
    console.log("🗑️  Đã xóa dữ liệu cũ");
  } catch (error) {
    console.error("❌ Lỗi khi xóa dữ liệu:", error);
  }
};

// Main function
const seedDatabase = async () => {
  await connectDB();

  console.log("\n🌱 Bắt đầu seed database...\n");

  // Uncomment dòng này nếu muốn xóa dữ liệu cũ trước
  // await clearData();

  await seedFeedbacks();
  await seedConversations();

  console.log("\n✨ Hoàn tất seed database!\n");

  // Hiển thị thống kê
  const feedbackCount = await Feedback.countDocuments();
  const conversationCount = await Conversation.countDocuments();
  const messageCount = await Message.countDocuments();

  console.log("📊 Thống kê:");
  console.log(`   - Feedbacks: ${feedbackCount}`);
  console.log(`   - Conversations: ${conversationCount}`);
  console.log(`   - Messages: ${messageCount}`);

  mongoose.connection.close();
};

// Chạy script
seedDatabase();
