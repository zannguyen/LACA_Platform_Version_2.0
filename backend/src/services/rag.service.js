const Place = require("../models/place.model");
const Post = require("../models/post.model");
const User = require("../models/user.model");
const Tag = require("../models/tag.model");
const Interest = require("../models/interest.model");

// Intent detection keywords
const INTENT_KEYWORDS = {
  place_query: [
    "địa điểm", "quán", "cafe", "cà phê", "coffee", "nhà hàng", "ăn uống",
    "ở đâu", "gần", "quanh đây", "tìm", "recommend", "gợi ý", "đi đâu",
    "uống", "ngồi", "ở", "chỗ", "quán nào", "quán gì", "địa chỉ",
    "vị trí", "nổi bật", "hot", "trending", "best", "popular"
  ],
  user_query: [
    "người dùng", "user", "ai đang", "có ai", "người nổi bật",
    "hot", "trending", "follow", "theo dõi"
  ],
  post_query: [
    "bài đăng", "post", "bài viết", "nội dung", "xem gì", "mới nhất",
    "hottest", "viral", "thịnh hành"
  ],
  how_to: [
    "cách", "dùng", "sử dụng", "làm sao", "như thế nào", "hướng dẫn",
    "tạo", "đăng", "viết", "chụp", "upload"
  ],
  help: [
    "giúp", "hỗ trợ", "support", "help", "sự cố", "lỗi", "problem",
    "không được", "không biết", "confused"
  ],
  stats: [
    "thống kê", "stats", "bao nhiêu", "số lượng", "có bao nhiêu",
    "tổng cộng", "nhiều không"
  ]
};

// Detect user intent from message
const detectIntent = (message) => {
  const lower = message.toLowerCase();
  const intents = [];

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        intents.push(intent);
        break;
      }
    }
  }

  return intents.length > 0 ? intents : ['general'];
};

// Get place stats (post count per place)
const getPlaceStats = async (limit = 10) => {
  const placeStats = await Post.aggregate([
    { $match: { placeId: { $ne: null } } },
    { $group: { _id: "$placeId", postCount: { $sum: 1 } } },
    { $sort: { postCount: -1 } },
    { $limit: limit }
  ]);

  return placeStats;
};

// Query places from database
const queryPlaces = async (message, location, limit = 10) => {
  const lower = message.toLowerCase();

  // Check if asking about popular/trending places
  const isPopularQuery = lower.includes("nổi bật") || lower.includes("nhiều") ||
                        lower.includes("hot") || lower.includes("trending") ||
                        lower.includes("popular") || lower.includes("best");

  // Extract category from message
  let category = null;
  if (lower.includes("cafe") || lower.includes("cà phê") || lower.includes("coffee")) {
    category = "cafe";
  } else if (lower.includes("nhà hàng") || lower.includes("ăn") || lower.includes("food")) {
    category = "restaurant";
  } else if (lower.includes("bar") || lower.includes("rượu") || lower.includes("beer")) {
    category = "bar";
  } else if (lower.includes("shop") || lower.includes("mua") || lower.includes("cửa hàng")) {
    category = "shop";
  } else if (lower.includes("park") || lower.includes("công viên") || lower.includes("dạo")) {
    category = "park";
  }

  let query = { isActive: true };

  if (category) {
    query.category = category;
  }

  let places;

  // If asking for popular places, get places with post counts
  if (isPopularQuery) {
    const placeStats = await Post.aggregate([
      { $match: { placeId: { $ne: null } } },
      { $group: { _id: "$placeId", postCount: { $sum: 1 } } },
      { $sort: { postCount: -1 } },
      { $limit: limit }
    ]);

    if (placeStats.length > 0) {
      const placeIds = placeStats.map(p => p._id);
      places = await Place.find({ _id: { $in: placeIds }, isActive: true });

      // Add postCount to each place
      const placesWithCount = places.map(place => {
        const stat = placeStats.find(s => s._id.toString() === place._id.toString());
        return {
          ...place.toObject(),
          postCount: stat ? stat.postCount : 0
        };
      });

      return placesWithCount;
    }
  }

  if (location && location.lat && location.lng) {
    places = await Place.find({
      ...query,
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [location.lng, location.lat] },
          $maxDistance: 10000, // 10km
        }
      }
    }).limit(limit);
  } else {
    // If no location, get popular places by post count OR just get recent places
    const placeStats = await Post.aggregate([
      { $match: { placeId: { $ne: null } } },
      { $group: { _id: "$placeId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit }
    ]);

    if (placeStats.length > 0) {
      const placeIds = placeStats.map(p => p._id);
      places = await Place.find({ _id: { $in: placeIds }, isActive: true }).limit(limit);
    } else {
      // If no posts with places, just get recent places
      places = await Place.find(query).sort({ createdAt: -1 }).limit(limit);
    }
  }

  // If still no places, get all active places
  if (!places || places.length === 0) {
    places = await Place.find({ isActive: true }).limit(limit);
  }

  return places;
};

// Query users from database
const queryUsers = async (message, limit = 5) => {
  const lower = message.toLowerCase();

  // Check if looking for popular users
  if (lower.includes("nổi bật") || lower.includes("hot") || lower.includes("trending") ||
      lower.includes("follow") || lower.includes("người dùng")) {

    // Get users with most posts
    const userStats = await Post.aggregate([
      { $group: { _id: "$userId", postCount: { $sum: 1 } } },
      { $sort: { postCount: -1 } },
      { $limit: limit }
    ]);

    const userIds = userStats.map(u => u._id);
    const users = await User.find({ _id: { $in: userIds } })
      .select("username fullname avatar")
      .limit(limit);

    return { type: "most_posts", users };
  }

  // Search by username if mentioned
  const usernameMatch = lower.match(/@(\w+)/);
  if (usernameMatch) {
    const users = await User.find({
      username: { $regex: usernameMatch[1], $options: "i" }
    }).select("username fullname avatar").limit(limit);
    return { type: "search", users };
  }

  return { type: "none", users: [] };
};

// Query posts from database
const queryPosts = async (message, location, limit = 5) => {
  const lower = message.toLowerCase();

  let query = { status: "active" };

  let posts;
  if (location && location.lat && location.lng) {
    posts = await Post.find(query)
      .populate("userId", "username fullname avatar")
      .populate("placeId", "name address")
      .sort({ createdAt: -1 })
      .limit(limit);
  } else {
    posts = await Post.find(query)
      .populate("userId", "username fullname avatar")
      .populate("placeId", "name address")
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  return posts;
};

// Get app statistics
const getAppStats = async () => {
  try {
    const [userCount, postCount, placeCount, tagCount] = await Promise.all([
      User.countDocuments(),
      Post.countDocuments({ status: "active" }),
      Place.countDocuments({ isActive: true }),
      Tag.countDocuments()
    ]);

    return { userCount, postCount, placeCount, tagCount };
  } catch (error) {
    console.error("Error getting app stats:", error);
    return null;
  }
};

// Get recent activity
const getRecentActivity = async (limit = 5) => {
  try {
    const recentPosts = await Post.find({ status: "active" })
      .populate("userId", "username fullname avatar")
      .populate("placeId", "name")
      .sort({ createdAt: -1 })
      .limit(limit);

    return recentPosts;
  } catch (error) {
    console.error("Error getting recent activity:", error);
    return [];
  }
};

// Main RAG query function
const queryDatabase = async (message, location) => {
  const intents = detectIntent(message);
  console.log("Detected intents:", intents);

  const context = {
    places: [],
    users: [],
    posts: [],
    stats: null,
    intents
  };

  // Always get stats - it's always useful
  context.stats = await getAppStats();

  // Query based on detected intents
  if (intents.includes("place_query") || intents.includes("general")) {
    context.places = await queryPlaces(message, location);
  }

  if (intents.includes("user_query")) {
    const userResult = await queryUsers(message);
    context.users = userResult.users;
  }

  if (intents.includes("post_query")) {
    context.posts = await queryPosts(message, location);
  }

  // If general query, still get places for context
  if (intents.includes("general")) {
    if (context.places.length === 0) {
      context.places = await queryPlaces(message, location, 5);
    }
    if (context.users.length === 0) {
      const userResult = await queryUsers(message, 5);
      context.users = userResult.users;
    }
    if (context.posts.length === 0) {
      context.posts = await queryPosts(message, location, 5);
    }
  }

  console.log("Context places:", context.places.length);
  console.log("Context users:", context.users.length);
  console.log("Context stats:", context.stats);

  return context;
};

// Format database context for AI
const formatContextForAI = (context) => {
  let formatted = "";

  if (context.stats) {
    formatted += `\n📊 Thống kê ứng dụng:\n`;
    formatted += `- Tổng người dùng: ${context.stats.userCount}\n`;
    formatted += `- Tổng bài đăng: ${context.stats.postCount}\n`;
    formatted += `- Địa điểm: ${context.stats.placeCount}\n`;
  }

  if (context.places.length > 0) {
    formatted += `\n📍 Địa điểm liên quan:\n`;
    context.places.forEach((place, index) => {
      formatted += `${index + 1}. ${place.name} (${place.category}) - ${place.address}\n`;
    });
  }

  if (context.users.length > 0) {
    formatted += `\n👥 Người dùng liên quan:\n`;
    context.users.forEach((user, index) => {
      formatted += `${index + 1}. ${user.fullname || user.username} (@${user.username})\n`;
    });
  }

  if (context.posts.length > 0) {
    formatted += `\n📝 Bài đăng gần đây:\n`;
    context.posts.slice(0, 3).forEach((post, index) => {
      const userName = post.userId?.fullname || post.userId?.username || "Unknown";
      const placeName = post.placeId?.name || "Không rõ địa điểm";
      formatted += `${index + 1}. ${userName} - ${placeName}\n`;
      if (post.content) {
        formatted += `   Nội dung: ${post.content.substring(0, 50)}...\n`;
      }
    });
  }

  return formatted;
};

module.exports = {
  detectIntent,
  queryDatabase,
  formatContextForAI,
  getAppStats,
  getRecentActivity,
  getPlaceStats
};
