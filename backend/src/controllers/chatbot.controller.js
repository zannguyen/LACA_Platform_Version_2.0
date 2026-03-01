require("dotenv").config({ path: __dirname + "/../../../.env" });
const ragService = require("../services/rag.service");
const axios = require("axios");

// System prompt for AI
const SYSTEM_PROMPT = `Bạn là trợ lý ảo của ứng dụng LACA - Mạng xã hội theo vị trí.

Nhiệm vụ:
1. Hỗ trợ người dùng sử dụng app LACA
2. Trả lời các câu hỏi về cách sử dụng app
3. Gợi ý địa điểm (quán cafe, nhà hàng, quán ăn, công viên, etc.) dựa trên dữ liệu được cung cấp
4. Trả lời thân thiện, ngắn gọn, dễ hiểu

Nguyên tắc:
- Trả lời bằng tiếng Việt
- Thân thiện và hữu ích
- Sử dụng thông tin từ database được cung cấp để trả lời chính xác
- Nếu không có đủ thông tin, hãy thừa nhận và gợi ý liên hệ hỗ trợ
- Sử dụng emoji để tin nhắn sinh động hơn`;

// Format database context for AI
const formatDbContext = (dbContext) => {
  let context = "";

  // Stats - always useful
  if (dbContext.stats) {
    context += "📊 THỐNG KÊ ỨNG DỤNG:\n";
    context += `• Tổng người dùng: ${dbContext.stats.userCount || 0}\n`;
    context += `• Tổng bài đăng: ${dbContext.stats.postCount || 0}\n`;
    context += `• Tổng địa điểm: ${dbContext.stats.placeCount || 0}\n`;
    context += `• Tổng tags: ${dbContext.stats.tagCount || 0}\n\n`;
  }

  // Places - most important for location-based queries
  if (dbContext.places && dbContext.places.length > 0) {
    context += "📍 ĐỊA ĐIỂM:\n";
    dbContext.places.forEach((place, index) => {
      context += `${index + 1}. ${place.name}\n`;
      context += `   • Loại: ${place.category || "Địa điểm"}\n`;
      if (place.address) context += `   • Địa chỉ: ${place.address}\n`;
      // Show post count if available (for popular places query)
      if (place.postCount !== undefined) {
        context += `   • Số bài đăng: ${place.postCount} bài 📝\n`;
      }
    });
    context += "\n";
  }

  // Users
  if (dbContext.users && dbContext.users.length > 0) {
    context += "👥 NGƯỜI DÙNG:\n";
    dbContext.users.forEach((user, index) => {
      context += `${index + 1}. ${user.fullname || user.username} - @${user.username}\n`;
    });
    context += "\n";
  }

  // Posts
  if (dbContext.posts && dbContext.posts.length > 0) {
    context += "📝 BÀI ĐĂNG GẦN ĐÂY:\n";
    dbContext.posts.slice(0, 5).forEach((post, index) => {
      const userName = post.userId?.fullname || post.userId?.username || "Unknown";
      const placeName = post.placeId?.name || "Không rõ địa điểm";
      context += `${index + 1}. ${userName} tại ${placeName}\n`;
      if (post.content) {
        const shortContent = post.content.length > 80 ? post.content.substring(0, 80) + "..." : post.content;
        context += `   Nội dung: ${shortContent}\n`;
      }
    });
  }

  return context;
};

// Call AI with RAG context using Groq
const callAI = async (message, dbContext) => {
  const context = formatDbContext(dbContext);

  // If no meaningful context, use simple response
  if (!context || (dbContext.places?.length === 0 && dbContext.users?.length === 0 && dbContext.posts?.length === 0 && !dbContext.stats)) {
    console.log("No context available, using fallback response");
    return null;
  }

  const systemMessage = `Bạn là trợ lý ảo thông minh của LACA - Mạng xã hội theo vị trí.

QUAN TRỌNG - NGUYÊN TẮC TRẢ LỜI:
1. LUÔN LUÔN sử dụng THÔNG TIN THỰ TỪ DATABASE bên dưới để trả lời
2. Nếu có danh sách địa điểm KÈM SỐ BÀI ĐĂNG - phải sắp xếp theo thứ tự nhiều bài đăng nhất
3. KHÔNG ĐƯỢC trả lời chung chung - phải dùng dữ liệu cụ thể
4. Trả lời ngắn gọn, có emoji, bằng tiếng Việt
5. Nếu người hỏi "nổi bật nhất" hay "nhiều người đăng bài nhất" - phải sắp xếp theo số bài đăng giảm dần

Ví dụ trả lời đúng:
- "📍 Địa điểm nhiều người đăng bài nhất:
   1. Quán A - 15 bài đăng - địa chỉ...
   2. Quán B - 10 bài đăng - địa chỉ..."
- "Có 5 người dùng nổi bật: 1. Nguyễn Văn A (@username), 2...."

Ví dụ trả lời SAI (không làm thế này):
- "Chào bạn, tôi có thể giúp gì cho bạn?"
- "Tuy nhiên, không có thông tin cụ thể..."

Dưới đây là dữ liệu từ database:`;

  const userMessage = `${context}

---

CÂU HỎI CỦA NGƯỜI DÙNG: "${message}"

Hãy trả lời CỤ THỂ dựa trên dữ liệu database ở trên. Đặc biệt chú ý:
- Nếu hỏi về địa điểm "nổi bật nhất" hay "nhiều người đăng bài nhất" -> sắp xếp theo số bài đăng giảm dần
- Hiển thị rõ số bài đăng của mỗi địa điểm`;

  // Try Groq first
  if (process.env.GROQ_API_KEY) {
    try {
      const response = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemMessage },
            { role: "user", content: userMessage }
          ],
          temperature: 0.3,
          max_tokens: 600
        },
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
          }
        }
      );

      const content = response.data.choices[0].message.content;
      console.log("AI Response content:", content);
      return content.trim();
    } catch (error) {
      console.error("Groq API Error:", error.response?.status || error.message);
      console.error("Groq Error Details:", error.response?.data);
    }
  }

  // Fallback to OpenAI if Groq fails
  if (process.env.OPENAI_API_KEY) {
    try {
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: systemMessage },
            { role: "user", content: userMessage }
          ],
          temperature: 0.3,
          max_tokens: 600
        },
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
          }
        }
      );

      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error("OpenAI API Error:", error.response?.status || error.message);
    }
  }

  return null;
};

// Smart response generation without AI (fallback)
const generateSmartResponse = (message, dbContext, location) => {
  const lowerMessage = message.toLowerCase();
  const intents = dbContext.intents || [];

  // === GREETING ===
  if (lowerMessage.includes("xin chào") || lowerMessage.includes("chào") ||
      lowerMessage.includes("hello") || lowerMessage.includes("hi") || lowerMessage.includes("hey")) {
    let response = "Xin chào! 👋\n\nTôi là trợ lý của LACA. Tôi có thể giúp bạn:\n\n";
    response += "📍 Tìm địa điểm gần bạn\n";
    response += "❓ Hướng dẫn sử dụng app\n";
    response += "📊 Xem thống kê\n";
    response += "📝 Đăng bài viết\n\n";
    response += "Bạn cần gì hôm nay?";
    return response;
  }

  // === PLACE QUERY ===
  if (intents.includes("place_query") || lowerMessage.includes("địa điểm") ||
      lowerMessage.includes("quán") || lowerMessage.includes("cafe") ||
      lowerMessage.includes("cà phê") || lowerMessage.includes("nhà hàng") ||
      lowerMessage.includes("restaurant") || lowerMessage.includes("coffee")) {

    if (dbContext.places && dbContext.places.length > 0) {
      let response = "📍 Tôi tìm được các địa điểm cho bạn:\n\n";

      dbContext.places.forEach((place, index) => {
        response += `${index + 1}. ${place.name}\n`;
        response += `   📌 ${place.category || "Địa điểm"}\n`;
        if (place.address) response += `   📍 ${place.address}\n`;
        response += "\n";
      });

      if (location) {
        response += "💡 Vị trí của bạn đang được sử dụng để tìm địa điểm gần nhất!\n";
      }

      response += "Bạn muốn tìm thêm địa điểm khác không?";
      return response;
    } else {
      let response = "😕 Xin lỗi, hiện tại chưa có địa điểm nào trong khu vực của bạn.\n\n";
      response += "💡 Bạn có thể:\n";
      response += "- Thử di chuyển đến khu vực khác\n";
      response += "- Đăng bài check-in tại địa điểm mới\n";
      response += "- Quay lại sau để xem các địa điểm mới!";
      return response;
    }
  }

  // === USER QUERY ===
  if (intents.includes("user_query") || lowerMessage.includes("người dùng") ||
      lowerMessage.includes("user") || lowerMessage.includes("ai đang") ||
      lowerMessage.includes("nổi bật") || lowerMessage.includes("hot") || lowerMessage.includes("trending")) {

    if (dbContext.users && dbContext.users.length > 0) {
      let response = "👥 Người dùng nổi bật:\n\n";

      dbContext.users.forEach((user, index) => {
        response += `${index + 1}. ${user.fullname || user.username}\n`;
        response += `   @${user.username}\n`;
      });

      response += "Bạn muốn xem thêm người dùng khác không?";
      return response;
    } else {
      return "😕 Hiện chưa có dữ liệu về người dùng nổi bật.\n\nHãy đăng nhiều bài hơn để có mặt trong danh sách nhé! 🌟";
    }
  }

  // === POST/POSTS QUERY ===
  if (intents.includes("post_query") || lowerMessage.includes("bài đăng") ||
      lowerMessage.includes("post") || lowerMessage.includes("bài viết") ||
      lowerMessage.includes("mới nhất") || lowerMessage.includes("xem gì")) {

    if (dbContext.posts && dbContext.posts.length > 0) {
      let response = "📝 Bài đăng gần đây:\n\n";

      dbContext.posts.slice(0, 3).forEach((post, index) => {
        const userName = post.userId?.fullname || post.userId?.username || "Unknown";
        const placeName = post.placeId?.name || "Không rõ địa điểm";
        response += `${index + 1}. ${userName} - ${placeName}\n`;
        if (post.content) {
          const shortContent = post.content.length > 50 ? post.content.substring(0, 50) + "..." : post.content;
          response += `   📄 ${shortContent}\n`;
        }
        response += "\n";
      });

      response += "Bạn muốn xem thêm bài đăng khác không?";
      return response;
    } else {
      return "😕 Hiện chưa có bài đăng nào.\n\nHãy là người đầu tiên đăng bài nhé! ✨";
    }
  }

  // === STATS QUERY ===
  if (intents.includes("stats") || lowerMessage.includes("thống kê") ||
      lowerMessage.includes("bao nhiêu") || lowerMessage.includes("số lượng") ||
      lowerMessage.includes("stats")) {

    if (dbContext.stats) {
      let response = "📊 Thống kê ứng dụng LACA:\n\n";
      response += `👥 Tổng người dùng: ${dbContext.stats.userCount || 0}\n`;
      response += `📝 Tổng bài đăng: ${dbContext.stats.postCount || 0}\n`;
      response += `📍 Tổng địa điểm: ${dbContext.stats.placeCount || 0}\n`;
      response += `🏷️ Tổng tags: ${dbContext.stats.tagCount || 0}\n\n`;
      response += "Wow, cộng đồng LACA đang phát triển rất tốt! 🎉";
      return response;
    }
  }

  // === HOW TO USE ===
  if (intents.includes("how_to") || lowerMessage.includes("cách") ||
      lowerMessage.includes("sử dụng") || lowerMessage.includes("dùng") ||
      lowerMessage.includes("làm sao") || lowerMessage.includes("như thế nào")) {

    let response = "📖 Hướng dẫn sử dụng LACA:\n\n";
    response += "1️⃣ Cho phép truy cập vị trí\n";
    response += "2️⃣ Khám phá bài đăng xung quanh bạn\n";
    response += "3️⃣ Thả tim ❤️ và bình luận 💬\n";
    response += "4️⃣ Kết bạn và chat với người mới\n";
    response += "5️⃣ Check-in tại địa điểm yêu thích\n";
    response += "6️⃣ Đăng bài để chia sẻ khoảnh khắc\n\n";
    response += "Bạn cần hỗ trợ gì thêm không?";
    return response;
  }

  // === HELP ===
  if (intents.includes("help") || lowerMessage.includes("giúp") ||
      lowerMessage.includes("hỗ trợ") || lowerMessage.includes("support") ||
      lowerMessage.includes("lỗi") || lowerMessage.includes("problem") ||
      lowerMessage.includes("không được") || lowerMessage.includes("confused")) {

    let response = "🆘 Tôi có thể giúp bạn:\n\n";
    response += "• Tìm địa điểm gần bạn\n";
    response += "• Hướng dẫn sử dụng app\n";
    response += "• Giải đáp thắc mắc\n";
    response += "• Xem thống kê\n\n";
    response += "Bạn đang gặp vấn đề gì?";
    return response;
  }

  // === HOW TO POST ===
  if (lowerMessage.includes("đăng bài") || lowerMessage.includes("post") ||
      lowerMessage.includes("tạo bài") || lowerMessage.includes("viết bài") ||
      lowerMessage.includes("chụp") || lowerMessage.includes("upload")) {

    let response = "📝 Cách đăng bài:\n\n";
    response += "1️⃣ Nhấn nút + ở giữa thanh công cụ\n";
    response += "2️⃣ Chọn ảnh hoặc video\n";
    response += "3️⃣ Viết nội dung bài đăng\n";
    response += "4️⃣ Chọn vị trí (check-in)\n";
    response += "5️⃣ Thêm tags (#)\n";
    response += "6️⃣ Nhấn Đăng\n\n";
    response += "Cần giúp gì thêm không?";
    return response;
  }

  // === DEFAULT / FALLBACK ===
  let response = "😊 Cảm ơn tin nhắn của bạn!\n\n";
  response += "Tôi có thể giúp bạn:\n\n";
  response += "📍 Tìm địa điểm (quán cafe, nhà hàng...)\n";
  response += "❓ Hướng dẫn sử dụng\n";
  response += "📊 Xem thống kê\n";
  response += "📝 Cách đăng bài\n\n";
  response += "Bạn muốn tìm hiểu gì?";

  return response;
};

// Main handler
const handleMessage = async (req, res) => {
  try {
    const { message, userId, location, preferences } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Tin nhắn không được để trống",
      });
    }

    console.log("User message received:", message);

    // === RAG: Query database for relevant context ===
    const dbContext = await ragService.queryDatabase(message, location);
    console.log("DB Context - Places:", dbContext.places?.length);
    console.log("DB Context - Users:", dbContext.users?.length);
    console.log("DB Context - Stats:", dbContext.stats);
    console.log("DB Context - Intents:", dbContext.intents);

    // Determine response type based on intents
    let responseType = "general";
    const intents = dbContext.intents || [];
    if (intents.includes("place_query")) responseType = "place_recommendation";
    else if (intents.includes("user_query")) responseType = "user_query";
    else if (intents.includes("post_query")) responseType = "post_query";
    else if (intents.includes("stats")) responseType = "statistics";

    // Try to call AI first
    let response = null;
    let aiFailed = false;
    try {
      response = await callAI(message, dbContext);
      console.log("Final AI response:", response);
    } catch (aiError) {
      console.error("AI call failed:", aiError.message);
      aiFailed = true;
    }

    // Check if AI response is using context properly
    const isGenericGreeting = (text) => {
      const genericPhrases = [
        "xin chào",
        "tôi là trợ lý",
        "tôi có thể giúp",
        "bạn cần gì",
        "hôm nay",
        "cho phép tôi",
        "rất vui được"
      ];
      const lowerText = text.toLowerCase();
      // If response is short and contains only greeting phrases without data
      return text.length < 100 && genericPhrases.some(phrase => lowerText.includes(phrase));
    };

    // Fallback to smart response if AI fails or returns generic greeting
    if (!response || aiFailed || (response && isGenericGreeting(response))) {
      console.log("Using smart fallback (AI failed or generic response)");
      response = generateSmartResponse(message, dbContext, location);
      responseType = "smart_fallback";
    }

    res.json({
      success: true,
      data: {
        message: response,
        type: responseType,
        context: {
          places: dbContext.places,
          users: dbContext.users,
          stats: dbContext.stats
        }
      },
    });
  } catch (error) {
    console.error("Chatbot error:", error);

    // Fallback response if database fails
    const fallbackResponse = "Xin lỗi, có lỗi xảy ra. Bạn thử lại sau nhé! 😅\n\nNếu cần hỗ trợ, liên hệ: support@laca.app";

    res.json({
      success: true,
      data: {
        message: fallbackResponse,
        type: "fallback",
      },
    });
  }
};

module.exports = {
  handleMessage,
};
