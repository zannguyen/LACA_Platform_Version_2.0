const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://zannguyen:zannguyen@laca.gm9ln1j.mongodb.net/social_local_db?retryWrites=true&w=majority';

const categorySchema = new mongoose.Schema({
  name: { type: String, unique: true, lowercase: true },
  description: String,
  icon: String,
  color: String,
  order: Number,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const tagSchema = new mongoose.Schema({
  name: { type: String, lowercase: true },
  description: String,
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  icon: String,
  color: String,
  order: Number,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);
const Tag = mongoose.models.Tag || mongoose.model('Tag', tagSchema);

const SEED_DATA = [
  { name: "thể thao", description: "Các hoạt động thể thao và trò chơi", icon: "⚽", color: "#FF6B6B", order: 1 },
  { name: "ẩm thực", description: "Quán ăn, nhà hàng, đặc sản địa phương", icon: "🍽️", color: "#FFA500", order: 2 },
  { name: "du lịch", description: "Địa điểm du lịch, phượt, trải nghiệm", icon: "✈️", color: "#4ECDC4", order: 3 },
  { name: "sức khỏe & wellness", description: "Gym, yoga, spa, chăm sóc sức khỏe", icon: "💪", color: "#95E1D3", order: 4 },
  { name: "nghệ thuật & sáng tạo", description: "Hội họa, âm nhạc, múa, sân khấu", icon: "🎨", color: "#F38181", order: 5 },
  { name: "công nghệ", description: "Lập trình, công nghệ, startup", icon: "💻", color: "#AA96DA", order: 6 },
  { name: "xã hội & cộng đồng", description: "Tình nguyện, từ thiện, hoạt động xã hội", icon: "🤝", color: "#FCBAD3", order: 7 },
  { name: "giáo dục & học tập", description: "Lớp học, khóa học, workshop, seminar", icon: "📚", color: "#F4A261", order: 8 }
];

const TAG_DATA = {
  "thể thao": [
    { name: "bóng đá", description: "Bóng đá 5 người, 7 người, 11 người", icon: "⚽" },
    { name: "cầu lông", description: "Badminton, đơn, đôi", icon: "🏸" },
    { name: "bóng chuyền", description: "Bóng chuyền bãi, sân", icon: "🏐" },
    { name: "bóng rổ", description: "Bóng rổ 3v3, 5v5", icon: "🏀" },
    { name: "tennis", description: "Tennis sân cỏ, sân xi măng", icon: "🎾" },
    { name: "chạy bộ", description: "Chạy marathon, half-marathon, jog", icon: "🏃" },
    { name: "bơi lội", description: "Bơi lội, lặn biển", icon: "🏊" },
    { name: "thể dục", description: "Thể dục nhịp điệu, aerobic", icon: "🧘" }
  ],
  "ẩm thực": [
    { name: "ăn việt", description: "Cơm, phở, bánh mì, đặc sản Việt", icon: "🍲" },
    { name: "ăn châu á", description: "Thái, Nhật, Hàn, Trung", icon: "🍜" },
    { name: "ăn tây", description: "Pizza, burger, steak, pasta", icon: "🍕" },
    { name: "quán cà phê", description: "Quán cà phê, trà, đồ uống", icon: "☕" },
    { name: "ăn nhẹ", description: "Snack, bánh, kẹo, tráng miệng", icon: "🍰" },
    { name: "hải sản", description: "Cơm hải sản, lẩu hải sản", icon: "🦐" },
    { name: "bbq/nướng", description: "Nướng thịt, thịt nướng lò", icon: "🍖" }
  ],
  "du lịch": [
    { name: "biển", description: "Bãi biển, lặn, thuyền", icon: "🏖️" },
    { name: "núi", description: "Núi, leo núi, cắm trại", icon: "⛰️" },
    { name: "thành phố", description: "Thành phố, khám phá đô thị", icon: "🏙️" },
    { name: "quanh quẩn", description: "Quanh quẩn nội thành, picnic", icon: "🌳" },
    { name: "lịch sử văn hóa", description: "Di tích, bảo tàng, di sản", icon: "🏛️" },
    { name: "nông thôn", description: "Nông trại, làng quê, ngoại ô", icon: "🌾" }
  ],
  "sức khỏe & wellness": [
    { name: "gym", description: "Gym, tập tạ, CrossFit", icon: "💪" },
    { name: "yoga", description: "Yoga, thiền, stretching", icon: "🧘" },
    { name: "spa", description: "Spa, massage, chăm sóc da", icon: "💆" },
    { name: "dinh dưỡng", description: "Ăn sạch, clean eating, diet", icon: "🥗" },
    { name: "tâm lý", description: "Tầm soát tâm lý, trị liệu", icon: "🧠" }
  ],
  "nghệ thuật & sáng tạo": [
    { name: "hội họa", description: "Vẽ, tranh, khóa học vẽ", icon: "🎨" },
    { name: "âm nhạc", description: "Nhạc sống, karaoke, học nhạc", icon: "🎵" },
    { name: "múa", description: "Múa hiện đại, khiêu vũ, belly dance", icon: "💃" },
    { name: "sân khấu", description: "Kịch, tập kịch, biểu diễn", icon: "🎭" },
    { name: "chụp ảnh", description: "Chụp ảnh, workshop ảnh", icon: "📸" },
    { name: "viết lách", description: "Viết truyện, thơ, workshop viết", icon: "✍️" }
  ],
  "công nghệ": [
    { name: "lập trình", description: "Web, mobile, game development", icon: "💻" },
    { name: "khởi nghiệp", description: "Startup, kinh doanh, ý tưởng", icon: "🚀" },
    { name: "ai & machine learning", description: "AI, ML, deep learning", icon: "🤖" },
    { name: "thiết kế", description: "UI/UX, graphic design", icon: "🎨" },
    { name: "chia sẻ kinh nghiệm", description: "Tech talk, workshop", icon: "📚" }
  ],
  "xã hội & cộng đồng": [
    { name: "tình nguyện", description: "Tình nguyện viên, giúp đỡ cộng đồng", icon: "🤝" },
    { name: "từ thiện", description: "Quyên góp, hỗ trợ từ thiện", icon: "❤️" },
    { name: "bảo vệ môi trường", description: "Môi trường, tái chế, bền vững", icon: "🌱" },
    { name: "nữ quyền", description: "Nữ quyền, bình đẳng giới", icon: "👩" },
    { name: "lgbtq+", description: "Cộng đồng LGBTQ+, đa dạng", icon: "🌈" }
  ],
  "giáo dục & học tập": [
    { name: "ngoại ngữ", description: "Tiếng Anh, tiếng Trung, tiếng Pháp", icon: "🌍" },
    { name: "kỹ năng mềm", description: "Giao tiếp, lãnh đạo, tư duy", icon: "🧠" },
    { name: "khóa online", description: "Coursera, Udemy, khóa học online", icon: "💻" },
    { name: "mentoring", description: "Hướng dẫn, tư vấn học tập", icon: "👨‍🏫" }
  ]
};

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear old data
    await Category.deleteMany({});
    await Tag.deleteMany({});
    console.log('🗑️ Cleared old data');

    // Create categories
    const categories = {};
    for (const data of SEED_DATA) {
      const cat = await Category.create(data);
      categories[data.name] = cat;
      console.log(`📁 Created: ${cat.name}`);
    }

    // Create tags
    let totalTags = 0;
    for (const [catName, tags] of Object.entries(TAG_DATA)) {
      const cat = categories[catName];
      for (let i = 0; i < tags.length; i++) {
        const tagData = tags[i];
        await Tag.create({
          name: tagData.name,
          description: tagData.description,
          categoryId: cat._id,
          icon: tagData.icon,
          color: cat.color,
          order: i + 1,
          isActive: true
        });
        totalTags++;
      }
      console.log(`   └─ ${tags.length} tags`);
    }

    console.log(`\n✨ Done! ${SEED_DATA.length} categories, ${totalTags} tags`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

seed();
