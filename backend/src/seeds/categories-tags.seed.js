/**
 * Seed script to populate database with sample categories and tags
 * Usage: node src/seeds/categories-tags.seed.js
 */

const mongoose = require("mongoose");
require("dotenv").config();

const Category = require("../models/category.model");
const Tag = require("../models/tag.model");

const SAMPLE_DATA = [
  {
    category: {
      name: "Thể Thao",
      description: "Các hoạt động thể thao và trò chơi",
      icon: "⚽",
      color: "#FF6B6B",
      order: 1,
    },
    tags: [
      { name: "Bóng Đá", description: "Bóng đá 5 người, 7 người, 11 người", icon: "⚽", order: 1 },
      { name: "Cầu Lông", description: "Badminton, đơn, đôi", icon: "🏸", order: 2 },
      { name: "Bóng Chuyền", description: "Bóng chuyền bãi, sân", icon: "🏐", order: 3 },
      { name: "Bóng Rổ", description: "Bóng rổ 3v3, 5v5", icon: "🏀", order: 4 },
      { name: "Tennis", description: "Tennis sân cỏ, sân xi măng", icon: "🎾", order: 5 },
      { name: "Chạy Bộ", description: "Chạy marathon, half-marathon, jog", icon: "🏃", order: 6 },
      { name: "Bơi Lội", description: "Bơi lội, lặn biển", icon: "🏊", order: 7 },
      { name: "Thể Dục", description: "Thể dục nhịp điệu, aerobic", icon: "🧘", order: 8 },
    ],
  },
  {
    category: {
      name: "Ẩm Thực",
      description: "Quán ăn, nhà hàng, đặc sản địa phương",
      icon: "🍽️",
      color: "#FFA500",
      order: 2,
    },
    tags: [
      { name: "Ăn Việt", description: "Cơm, phở, bánh mì, đặc sản Việt", icon: "🍲", order: 1 },
      { name: "Ăn Châu Á", description: "Thái, Nhật, Hàn, Trung", icon: "🍜", order: 2 },
      { name: "Ăn Tây", description: "Pizza, burger, steak, pasta", icon: "🍕", order: 3 },
      { name: "Quán Cà Phê", description: "Quán cà phê, trà, đồ uống", icon: "☕", order: 4 },
      { name: "Ăn Nhẹ", description: "Snack, bánh, kẹo, tráng miệng", icon: "🍰", order: 5 },
      { name: "Hải Sản", description: "Cơm hải sản, lẩu hải sản", icon: "🦐", order: 6 },
      { name: "BBQ/Nướng", description: "Nướng thịt, thịt nướng lò", icon: "🍖", order: 7 },
    ],
  },
  {
    category: {
      name: "Du Lịch",
      description: "Địa điểm du lịch, phượt, trải nghiệm",
      icon: "✈️",
      color: "#4ECDC4",
      order: 3,
    },
    tags: [
      { name: "Biển", description: "Bãi biển, lặn, thuyền", icon: "🏖️", order: 1 },
      { name: "Núi", description: "Núi, leo núi, cắm trại", icon: "⛰️", order: 2 },
      { name: "Thành Phố", description: "Thành phố, khám phá đô thị", icon: "🏙️", order: 3 },
      { name: "Quanh Quẩn", description: "Quanh quẩn nội thành, picnic", icon: "🌳", order: 4 },
      { name: "Lịch Sử Văn Hóa", description: "Di tích, bảo tàng, di sản", icon: "🏛️", order: 5 },
      { name: "Nông Thôn", description: "Nông trại, làng quê, ngoại ô", icon: "🌾", order: 6 },
    ],
  },
  {
    category: {
      name: "Sức Khỏe & Wellness",
      description: "Gym, yoga, spa, chăm sóc sức khỏe",
      icon: "💪",
      color: "#95E1D3",
      order: 4,
    },
    tags: [
      { name: "Gym", description: "Gym, tập tạ, CrossFit", icon: "💪", order: 1 },
      { name: "Yoga", description: "Yoga, thiền, stretching", icon: "🧘", order: 2 },
      { name: "Spa", description: "Spa, massage, chăm sóc da", icon: "💆", order: 3 },
      { name: "Dinh Dưỡng", description: "Ăn sạch, clean eating, diet", icon: "🥗", order: 4 },
      { name: "Tâm Lý", description: "Tầm soát tâm lý, trị liệu", icon: "🧠", order: 5 },
    ],
  },
  {
    category: {
      name: "Nghệ Thuật & Sáng Tạo",
      description: "Hội họa, âm nhạc, múa, sân khấu",
      icon: "🎨",
      color: "#F38181",
      order: 5,
    },
    tags: [
      { name: "Hội Họa", description: "Vẽ, tranh, khóa học vẽ", icon: "🎨", order: 1 },
      { name: "Âm Nhạc", description: "Nhạc sống, karaoke, học nhạc", icon: "🎵", order: 2 },
      { name: "Múa", description: "Múa hiện đại, khiêu vũ, belly dance", icon: "💃", order: 3 },
      { name: "Sân Khấu", description: "Kịch, tập kịch, biểu diễn", icon: "🎭", order: 4 },
      { name: "Chụp Ảnh", description: "Chụp ảnh, workshop ảnh", icon: "📸", order: 5 },
      { name: "Viết Lách", description: "Viết truyện, thơ, workshop viết", icon: "✍️", order: 6 },
    ],
  },
  {
    category: {
      name: "Công Nghệ",
      description: "Lập trình, công nghệ, startup",
      icon: "💻",
      color: "#AA96DA",
      order: 6,
    },
    tags: [
      { name: "Lập Trình", description: "Web, mobile, game development", icon: "💻", order: 1 },
      { name: "Khởi Nghiệp", description: "Startup, kinh doanh, ý tưởng", icon: "🚀", order: 2 },
      { name: "AI & Machine Learning", description: "AI, ML, deep learning", icon: "🤖", order: 3 },
      { name: "Thiết Kế", description: "UI/UX, graphic design", icon: "🎨", order: 4 },
      { name: "Chia Sẻ Kinh Nghiệm", description: "Tech talk, workshop", icon: "📚", order: 5 },
    ],
  },
  {
    category: {
      name: "Xã Hội & Cộng Đồng",
      description: "Tình nguyện, từ thiện, hoạt động xã hội",
      icon: "🤝",
      color: "#FCBAD3",
      order: 7,
    },
    tags: [
      { name: "Tình Nguyện", description: "Tình nguyện viên, giúp đỡ cộng đồng", icon: "🤝", order: 1 },
      { name: "Từ Thiện", description: "Quyên góp, hỗ trợ từ thiện", icon: "❤️", order: 2 },
      { name: "Bảo Vệ Môi Trường", description: "Môi trường, tái chế, bền vững", icon: "🌱", order: 3 },
      { name: "Nữ Quyền", description: "Nữ quyền, bình đẳng giới", icon: "👩", order: 4 },
      { name: "LGBTQ+", description: "Cộng đồng LGBTQ+, đa dạng", icon: "🌈", order: 5 },
    ],
  },
  {
    category: {
      name: "Giáo Dục & Học Tập",
      description: "Lớp học, khóa học, workshop, seminar",
      icon: "📚",
      color: "#F4A261",
      order: 8,
    },
    tags: [
      { name: "Ngoại Ngữ", description: "Tiếng Anh, tiếng Trung, tiếng Pháp", icon: "🌍", order: 1 },
      { name: "Kỹ Năng Mềm", description: "Giao tiếp, lãnh đạo, tư duy", icon: "🧠", order: 2 },
      { name: "Khóa Online", description: "Coursera, Udemy, khóa học online", icon: "💻", order: 3 },
      { name: "Mentoring", description: "Hướng dẫn, tư vấn học tập", icon: "👨‍🏫", order: 4 },
    ],
  },
];

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/laca");
    console.log("✅ Connected to MongoDB");

    // Clear existing data
    await Category.deleteMany({});
    await Tag.deleteMany({});
    console.log("🗑️  Cleared existing categories and tags");

    // Seed data
    let totalTags = 0;
    for (const item of SAMPLE_DATA) {
      // Create category
      const category = await Category.create(item.category);
      console.log(`📁 Created category: ${category.name}`);

      // Create tags for this category
      const tagsData = item.tags.map((tag) => ({
        ...tag,
        categoryId: category._id,
      }));
      const createdTags = await Tag.insertMany(tagsData);
      console.log(`   ├─ Created ${createdTags.length} tags`);
      totalTags += createdTags.length;
    }

    console.log("\n✨ Seeding complete!");
    console.log(`📊 Summary:`);
    console.log(`   ├─ Categories: ${SAMPLE_DATA.length}`);
    console.log(`   └─ Tags: ${totalTags}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:", error.message);
    process.exit(1);
  }
}

// Run seed script
seedDatabase();
