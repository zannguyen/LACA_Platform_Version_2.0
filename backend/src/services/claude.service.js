const axios = require("axios");
const AppError = require("../utils/appError");

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-opus-4-6";
const CLAUDE_TIMEOUT = parseInt(process.env.CLAUDE_TIMEOUT || "30000");

const claudeClient = axios.create({
  baseURL: "https://api.anthropic.com/v1",
  headers: {
    "x-api-key": CLAUDE_API_KEY,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
  },
  timeout: CLAUDE_TIMEOUT,
});

/**
 * Analyze post content and extract topics
 * @param {Object} postData - Post data { content, mediaUrl, place }
 * @returns {Promise<Object>} - { topics: [], confidence: number, summary: string }
 */
const analyzePostContent = async (postData) => {
  try {
    if (!CLAUDE_API_KEY) {
      console.warn("Claude API key not configured, skipping analysis");
      return null;
    }

    const { content, place } = postData;

    // Build analysis prompt
    const prompt = `Analyze this social media post and extract the main topics/themes.

Post Content: "${content}"
${place ? `Location: ${place.name}, Category: ${place.category}` : ""}

Please provide:
1. Main topics (list 2-5 relevant topics)
2. Confidence score (0-1)
3. Brief summary (1-2 sentences)

Respond in JSON format:
{
  "topics": ["topic1", "topic2"],
  "confidence": 0.85,
  "summary": "Brief description"
}`;

    const response = await claudeClient.post("/messages", {
      model: CLAUDE_MODEL,
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    // Extract text from response
    const responseText =
      response.data.content[0].type === "text" ? response.data.content[0].text : "";

    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid response format from Claude");
    }

    const analysis = JSON.parse(jsonMatch[0]);

    return {
      topics: analysis.topics || [],
      confidence: analysis.confidence || 0.5,
      summary: analysis.summary || "",
    };
  } catch (error) {
    console.error("Claude analysis error:", error.message);
    // Return null on error - don't break post creation
    return null;
  }
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
    .map(([topic, count]) => ({
      topic,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10 topics
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

  // Filter trending topics that match user interests
  const matchedTopics = trendingTopics.filter((t) =>
    interestNames.some((interest) => t.topic.toLowerCase().includes(interest))
  );

  // If no matches, return top trending
  if (matchedTopics.length === 0) {
    return trendingTopics.slice(0, 5);
  }

  return matchedTopics.slice(0, 5);
};

module.exports = {
  analyzePostContent,
  getTrendingTopics,
  getRecommendedTopics,
};
