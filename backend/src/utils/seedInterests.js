const mongoose = require("mongoose");
const Interest = require("../models/interest.model");
require("dotenv").config();

const defaultInterests = [
  {
    name: "Travel",
    description: "Explore new places and different cultures",
    icon: "✈️",
  },
  {
    name: "Photography",
    description: "Capture moments and create visual content",
    icon: "📷",
  },
  {
    name: "Food",
    description: "Discover and enjoy delicious cuisines",
    icon: "🍜",
  },
  {
    name: "Coffee",
    description: "Love for coffee culture and cafes",
    icon: "☕",
  },
  {
    name: "Reading",
    description: "Read books and share knowledge",
    icon: "📚",
  },
  {
    name: "Music",
    description: "Listen to music, concerts and music events",
    icon: "🎵",
  },
  {
    name: "Sports",
    description: "Sports activities and fitness",
    icon: "⚽",
  },
  {
    name: "Art",
    description: "Painting, art photography and creative activities",
    icon: "🎨",
  },
  {
    name: "Movies",
    description: "Watch movies and discuss cinema",
    icon: "🎬",
  },
  {
    name: "Gaming",
    description: "Play games and join gaming communities",
    icon: "🎮",
  },
  {
    name: "Hiking",
    description: "Outdoor activities and nature exploration",
    icon: "🏔️",
  },
  {
    name: "Yoga",
    description: "Practice yoga and meditation",
    icon: "🧘",
  },
  {
    name: "Cooking",
    description: "Cook and share delicious recipes",
    icon: "👨‍🍳",
  },
  {
    name: "Pets",
    description: "Pet care and animal lovers",
    icon: "🐾",
  },
  {
    name: "Fashion",
    description: "Interest in fashion trends and style",
    icon: "👗",
  },
  {
    name: "Technology",
    description: "Interest in technology and innovation",
    icon: "💻",
  },
  {
    name: "Shopping",
    description: "Shopping and finding deals",
    icon: "🛍️",
  },
  {
    name: "Anime & Manga",
    description: "Watch anime and read manga",
    icon: "🎌",
  },
];

async function seedInterests() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // Xóa tất cả interests cũ (nếu muốn reset)
    // await Interest.deleteMany({});
    // console.log("Cleared existing interests");

    // Thêm interests mới (chỉ thêm nếu chưa tồn tại)
    for (const interestData of defaultInterests) {
      const existing = await Interest.findOne({ name: interestData.name });
      if (!existing) {
        await Interest.create(interestData);
        console.log(`✓ Added: ${interestData.name}`);
      } else {
        console.log(`- Skipped (exists): ${interestData.name}`);
      }
    }

    console.log("\n✓ Seed interests completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding interests:", error);
    process.exit(1);
  }
}

seedInterests();
