const Place = require("../models/place.model");
const Post = require("../models/post.model");
const User = require("../models/user.model");
const Tag = require("../models/tag.model");
const Category = require("../models/category.model");
const Interest = require("../models/interest.model");

// Radius constants (in meters)
const DEFAULT_RADIUS = 5000; // 5km
const MAX_RADIUS = 10000; // 10km

// Map common search terms to tag names (normalized)
const TAG_KEYWORDS = {
  "cafe": ["cafe", "cà phê", "coffee", "café"],
  "nhà hàng": ["nhà hàng", "restaurant", "food", "ăn uống", "đồ ăn"],
  "bar": ["bar", "quán bar", "rượu", "beer", "bia", "pub"],
  "shop": ["shop", "cửa hàng", "mua sắm", "store"],
  "park": ["công viên", "park", "dạo", "walking"],
  "tiệc": ["tiệc", "party", "sinh nhật", "birthday"],
  "gym": ["gym", "fitness", "thể hình", "tập gym"],
  "spa": ["spa", "massage", "masage", "xả stress"],
  "khách sạn": ["khách sạn", "hotel", "住宿"],
  "bãi biển": ["bãi biển", "beach", "biển", "sea"],
  "núi": ["núi", "mountain", "leo núi", "hiking"],
  "view đẹp": ["view", "panorama", "phong cảnh", "cảnh đẹp"],
  "món ngon": ["món ngon", "đặc sản", "signature", "ngon"],
  "rẻ": ["rẻ", "cheap", "budget", "giá rẻ"],
  "free": ["free", "miễn phí", "free wifi", "wifi miễn phí"],
  "wifi": ["wifi", "internet"],
  "parking": ["parking", "đỗ xe", "gửi xe"],
  "live music": ["live music", "nhạc sống", "acoustic"],
  "pet": ["pet", "thú cưng", "dog friendly", "cat friendly"],
  "couple": ["couple", "cặp đôi", "tình nhân", "lãng mạn"],
  "family": ["family", "gia đình", "trẻ em", "kid friendly"],
  "work": ["work", "làm việc", "laptop", "remote", "coworking"]
};

// Map search terms to category
const CATEGORY_KEYWORDS = {
  "cafe": ["cafe", "cà phê", "coffee", "café"],
  "restaurant": ["nhà hàng", "restaurant", "food", "ăn uống"],
  "bar": ["bar", "quán bar", "rượu", "beer", "bia", "pub"],
  "shop": ["shop", "cửa hàng", "mua sắm", "store"],
  "park": ["công viên", "park", "dạo"],
  "hotel": ["khách sạn", "hotel"],
  "beach": ["bãi biển", "beach", "biển"],
  "mountain": ["núi", "mountain", "leo núi"]
};

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

// Extract tag names from user message
const extractTagsFromMessage = (message) => {
  const lower = message.toLowerCase();
  const matchedTags = [];

  for (const [tagName, keywords] of Object.entries(TAG_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        matchedTags.push(tagName);
        break;
      }
    }
  }

  return matchedTags;
};

// Extract category from user message
const extractCategoryFromMessage = (message) => {
  const lower = message.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        return category;
      }
    }
  }

  return null;
};

// Query places from database with location-based search
const queryPlaces = async (message, location, limit = 10) => {
  const lower = message.toLowerCase();

  // Check if asking about popular/trending places
  const isPopularQuery = lower.includes("nổi bật") || lower.includes("nhiều") ||
                        lower.includes("hot") || lower.includes("trending") ||
                        lower.includes("popular") || lower.includes("best") ||
                        lower.includes("hay nhất") || lower.includes("đáng ghé");

  // Extract category from message
  const category = extractCategoryFromMessage(message);

  // Extract tags from message
  const requestedTags = extractTagsFromMessage(message);

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
      { $limit: limit * 2 }
    ]);

    if (placeStats.length > 0) {
      const placeIds = placeStats.map(p => p._id);
      let placeQuery = { _id: { $in: placeIds }, isActive: true };
      if (category) {
        placeQuery.category = category;
      }

      places = await Place.find(placeQuery).limit(limit);

      // Add postCount to each place
      const placesWithCount = places.map(place => {
        const stat = placeStats.find(s => s._id.toString() === place._id.toString());
        return {
          ...place.toObject(),
          postCount: stat ? stat.postCount : 0
        };
      });

      // Sort by post count
      placesWithCount.sort((a, b) => b.postCount - a.postCount);
      return placesWithCount;
    }
  }

  // Use location if available - search within 5km
  if (location && location.lat && location.lng) {
    const radius = DEFAULT_RADIUS; // 5km

    // Build location query
    const locationQuery = {
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [location.lng, location.lat] },
          $maxDistance: radius
        }
      }
    };

    // If we have tags, find places that have posts with those tags
    if (requestedTags.length > 0) {
      // Find tags in database
      const dbTags = await Tag.find({
        name: { $in: requestedTags },
        isActive: true
      }).limit(10);

      if (dbTags.length > 0) {
        const tagIds = dbTags.map(t => t._id);

        // Find posts with those tags that have a place
        const postsWithTags = await Post.find({
          tags: { $in: tagIds },
          placeId: { $ne: null },
          status: "active"
        }).populate("placeId").limit(50);

        // Get unique place IDs from posts
        const placeIdsFromPosts = [...new Set(
          postsWithTags
            .filter(p => p.placeId)
            .map(p => p.placeId._id)
        )];

        if (placeIdsFromPosts.length > 0) {
          // Get places within radius that have posts with requested tags
          places = await Place.find({
            _id: { $in: placeIdsFromPosts },
            ...locationQuery,
            isActive: true
          }).limit(limit);

          // Add tag info and post count
          const placesWithInfo = places.map(place => {
            const relatedPosts = postsWithTags.filter(
              p => p.placeId && p.placeId._id.toString() === place._id.toString()
            );
            return {
              ...place.toObject(),
              postCount: relatedPosts.length,
              relatedTags: requestedTags
            };
          });

          return placesWithInfo;
        }
      }
    }

    // Default: just find places within radius
    places = await Place.find({
      ...query,
      ...locationQuery
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

// Query posts from database with location and tag filtering
const queryPosts = async (message, location, limit = 5) => {
  const lower = message.toLowerCase();

  // Extract tags and category from message
  const requestedTags = extractTagsFromMessage(message);
  const category = extractCategoryFromMessage(message);

  let query = { status: "active" };
  let posts;

  // If we have location, search within 5km
  if (location && location.lat && location.lng) {
    const radius = DEFAULT_RADIUS; // 5km

    // First, find places within radius
    const nearbyPlaceIds = await Place.distinct("_id", {
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [location.lng, location.lat] },
          $maxDistance: radius
        }
      },
      isActive: true
    });

    // If we have tags, filter posts by those tags
    if (requestedTags.length > 0 || category) {
      let tagQuery = {};

      if (requestedTags.length > 0) {
        const dbTags = await Tag.find({
          name: { $in: requestedTags },
          isActive: true
        }).limit(10);

        if (dbTags.length > 0) {
          tagQuery.tags = { $in: dbTags.map(t => t._id) };
        }
      }

      // Build post query with location and tags
      let postQuery = {
        ...tagQuery,
        status: "active"
      };

      // Filter by nearby places OR posts with tags at nearby places
      if (nearbyPlaceIds.length > 0) {
        postQuery.$or = [
          { placeId: { $in: nearbyPlaceIds } },
          { placeId: { $in: nearbyPlaceIds } } // Same but for clarity
        ];
      }

      // If there's a category filter, we need to match place category
      if (category && nearbyPlaceIds.length > 0) {
        const categoryPlaces = await Place.find({
          _id: { $in: nearbyPlaceIds },
          category: category,
          isActive: true
        }).select("_id");

        postQuery.placeId = { $in: categoryPlaces.map(p => p._id) };
      }

      posts = await Post.find(postQuery)
        .populate("userId", "username fullname avatar")
        .populate({
          path: "placeId",
          select: "name address category",
          match: { isActive: true }
        })
        .populate({
          path: "tags",
          select: "name categoryId",
          populate: { path: "categoryId", select: "name" }
        })
        .sort({ createdAt: -1 })
        .limit(limit);

      // Filter out posts where placeId didn't match (due to populate match)
      posts = posts.filter(p => p.placeId);

    } else {
      // No tags, just get posts from nearby places
      if (nearbyPlaceIds.length > 0) {
        query.placeId = { $in: nearbyPlaceIds };
      }

      posts = await Post.find(query)
        .populate("userId", "username fullname avatar")
        .populate({
          path: "placeId",
          select: "name address category",
          match: { isActive: true }
        })
        .populate({
          path: "tags",
          select: "name categoryId",
          populate: { path: "categoryId", select: "name" }
        })
        .sort({ createdAt: -1 })
        .limit(limit);
    }
  } else {
    // No location - get recent posts, optionally filtered by tags
    if (requestedTags.length > 0) {
      const dbTags = await Tag.find({
        name: { $in: requestedTags },
        isActive: true
      }).limit(10);

      if (dbTags.length > 0) {
        query.tags = { $in: dbTags.map(t => t._id) };
      }
    }

    posts = await Post.find(query)
      .populate("userId", "username fullname avatar")
      .populate({
        path: "placeId",
        select: "name address category",
        match: { isActive: true }
      })
      .populate({
        path: "tags",
        select: "name categoryId",
        populate: { path: "categoryId", select: "name" }
      })
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

// Calculate distance between two coordinates (in km)
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Format database context for AI
const formatContextForAI = (context, userLocation = null) => {
  let formatted = "";

  if (context.stats) {
    formatted += `\n📊 Thống kê ứng dụng:\n`;
    formatted += `- Tổng người dùng: ${context.stats.userCount}\n`;
    formatted += `- Tổng bài đăng: ${context.stats.postCount}\n`;
    formatted += `- Địa điểm: ${context.stats.placeCount}\n`;
  }

  if (context.places.length > 0) {
    formatted += `\n📍 Địa điểm gần bạn (trong bán kính 5km):\n`;
    context.places.forEach((place, index) => {
      let distanceInfo = "";
      if (userLocation && place.location && place.location.coordinates) {
        const [lng, lat] = place.location.coordinates;
        const dist = calculateDistance(userLocation.lat, userLocation.lng, lat, lng);
        distanceInfo = ` - Cách ${dist.toFixed(1)}km`;
      }

      let postCountInfo = place.postCount ? ` (${place.postCount} bài đăng)` : "";
      let categoryInfo = place.category ? `[${place.category}] ` : "";

      formatted += `${index + 1}. ${categoryInfo}${place.name}${postCountInfo}${distanceInfo}\n`;
      formatted += `   📌 ${place.address || "Không có địa chỉ"}\n`;
    });
  }

  if (context.users.length > 0) {
    formatted += `\n👥 Người dùng nổi bật:\n`;
    context.users.forEach((user, index) => {
      formatted += `${index + 1}. ${user.fullname || user.username} (@${user.username})\n`;
    });
  }

  if (context.posts.length > 0) {
    formatted += `\n📝 Bài đăng gần đây trong khu vực:\n`;
    context.posts.slice(0, 5).forEach((post, index) => {
      const userName = post.userId?.fullname || post.userId?.username || "Unknown";
      const placeName = post.placeId?.name || "Không rõ địa điểm";
      const placeCategory = post.placeId?.category || "";

      formatted += `${index + 1}. ${userName} đăng tại [${placeCategory}] ${placeName}\n`;
      if (post.content) {
        formatted += `   💬 "${post.content.substring(0, 80)}${post.content.length > 80 ? '...' : ''}"\n`;
      }

      // Show tags if available
      if (post.tags && post.tags.length > 0) {
        const tagNames = post.tags.map(t => t.name).join(", ");
        formatted += `   🏷️ Tags: ${tagNames}\n`;
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
