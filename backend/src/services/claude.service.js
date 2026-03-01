const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Analyze post content and extract topics using OpenAI
 * @param {Object} postData - Post data { content, mediaUrl, place, userInterests }
 * @returns {Promise<Object>} - { topics: [], confidence: number, summary: string }
 */
const analyzePostContent = async (postData) => {
  const MAX_RETRIES = 3;
  const BASE_DELAY = 1000; // 1 second

  const makeRequest = async (attempt = 0) => {
    try {
      const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

      // ⚠️ TEMPORARILY: Bypass OpenAI to use mock analysis
      // Remove this line when OpenAI quota is available
      console.warn(
        "[OpenAI] OpenAI disabled - using mock analysis for testing"
      );
      return generateMockAnalysis(postData);

      const { content, place, userInterests = [] } = postData;

      const interestNames = userInterests
        .map((i) => (typeof i === "string" ? i : i.name))
        .filter(Boolean);

      const interestContext =
        interestNames.length > 0
          ? `User interests: ${interestNames.join(", ")}`
          : "";

      const prompt = `Analyze this social media post and extract the main topics/themes.

Post Content: "${content || "(no caption)"}"
${place ? `Location: ${place.name}, Category: ${place.category}` : ""}
${interestContext}

Instructions:
- Extract 2-5 relevant topics from the post content and location
${interestNames.length > 0 ? `- Prioritize topics that relate to the user's interests: ${interestNames.join(", ")}` : ""}
- Assign a confidence score (0-1) based on how clearly the topics are expressed
- Write a brief 1-2 sentence summary

Respond ONLY in JSON format:
{
  "topics": ["topic1", "topic2"],
  "confidence": 0.85,
  "summary": "Brief description"
}`;

      console.log("[OpenAI] Sending analysis request...");

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      const responseText =
        response.choices?.[0]?.message?.content || "";

      if (!responseText) {
        console.error("[OpenAI] No text content in response");
        throw new Error("No text content in OpenAI response");
      }

      console.log("[OpenAI] Response text:", responseText);

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("[OpenAI] Could not extract JSON from response text");
        throw new Error("Invalid response format from OpenAI");
      }

      const analysis = JSON.parse(jsonMatch[0]);

      return {
        topics: analysis.topics || [],
        confidence: analysis.confidence || 0.5,
        summary: analysis.summary || "",
      };
    } catch (error) {
      const status = error.status;
      const isRateLimit = status === 429;
      const isTimeout = error.code === "ECONNABORTED" || error.message?.includes("timeout");

      console.error(
        `OpenAI analysis error (attempt ${attempt + 1}/${MAX_RETRIES}):`,
        {
          status,
          code: error.code,
          message: error.message,
          type: error.type,
          fullError: JSON.stringify(error, null, 2),
        }
      );

      // Retry on rate limit (429) or timeout
      if ((isRateLimit || isTimeout) && attempt < MAX_RETRIES) {
        const delay = BASE_DELAY * Math.pow(2, attempt); // exponential backoff
        console.warn(
          `Retrying in ${delay}ms... (${attempt + 1}/${MAX_RETRIES})`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        return makeRequest(attempt + 1);
      }

      // Fall back to mock analysis if API fails
      console.warn("Falling back to mock analysis due to API error");
      return generateMockAnalysis(postData);
    }
  };

  return makeRequest();
};

/**
 * Generate mock analysis for testing/demo purposes
 */
const generateMockAnalysis = (postData) => {
  const { content, place, userInterests = [] } = postData;

  // Extract keywords from content
  const words = (content || "").toLowerCase().split(/\s+/);
  const topics = [];

  // Mock topic generation based on keywords and interests
  const interestNames = userInterests
    .map((i) => (typeof i === "string" ? i : i.name))
    .filter(Boolean);

  if (interestNames.length > 0) {
    topics.push(...interestNames.slice(0, 3));
  }

  if (place) {
    topics.push(place.name, place.category);
  }

  // Add some keywords from content
  const keywords = ["sport", "activity", "outdoor", "fun", "game"];
  keywords.forEach((kw) => {
    if (words.some((w) => w.includes(kw))) {
      topics.push(kw);
    }
  });

  return {
    topics: [...new Set(topics)].slice(0, 5), // Remove duplicates, max 5
    confidence: 0.7,
    summary: `Post about ${place?.name || "local activity"} with interests: ${interestNames.join(", ") || "general"}`,
  };
};

/**
 * Get trending topics from recent posts
 * @param {Array} recentAnalyses - Array of PostAnalysis documents
 * @returns {Array} - Sorted topics with counts
 */
const getTrendingTopics = (recentAnalyses) => {
  const topicCounts = {};

  recentAnalyses.forEach((analysis) => {
    if (analysis.topics && Array.isArray(analysis.topics)) {
      analysis.topics.forEach((topic) => {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      });
    }
  });

  return Object.entries(topicCounts)
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
};

/**
 * Get recommended topics based on user interests
 * @param {Array} userInterests - User's interest names
 * @param {Array} trendingTopics - Trending topics
 * @returns {Array} - Recommended topics
 */
const getRecommendedTopics = (userInterests, trendingTopics) => {
  if (!userInterests || userInterests.length === 0) {
    return trendingTopics.slice(0, 5);
  }

  const interestNames = userInterests.map((i) =>
    typeof i === "string" ? i.toLowerCase() : i.name?.toLowerCase()
  );

  const matchedTopics = trendingTopics.filter((t) =>
    interestNames.some((interest) => t.topic.toLowerCase().includes(interest))
  );

  if (matchedTopics.length === 0) return trendingTopics.slice(0, 5);

  return matchedTopics.slice(0, 5);
};

module.exports = {
  analyzePostContent,
  getTrendingTopics,
  getRecommendedTopics,
};
