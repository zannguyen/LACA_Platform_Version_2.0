const claudeService = require("./claude.service");
const PostAnalysis = require("../models/postAnalysis.model");
const Post = require("../models/post.model");

// In-memory queue without Redis
// Note: Jobs are lost on restart. For production, use Redis + Bull.
class SimpleAnalysisQueue {
  constructor() {
    this.jobs = [];
    this.processing = false;
    this.stats = {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
    };
  }

  async add(jobData, options = {}) {
    const job = {
      id: Date.now() + Math.random(),
      data: jobData,
      attempts: 0,
      maxAttempts: options.attempts || 3,
      backoffDelay: options.backoff?.delay || 2000,
      createdAt: new Date(),
    };

    this.jobs.push(job);
    this.stats.waiting++;

    console.log(
      `[Queue] Enqueued job ${job.id} (${this.stats.waiting} waiting)`,
    );

    // Start processing
    this.process();

    return { id: job.id };
  }

  async process() {
    if (this.processing || this.jobs.length === 0) return;

    this.processing = true;

    while (this.jobs.length > 0) {
      const job = this.jobs.shift();
      this.stats.waiting--;
      this.stats.active++;

      try {
        console.log(
          `[Queue] Processing job ${job.id} (${job.attempts + 1}/${job.maxAttempts})`,
        );

        const result = await this.processJob(job);

        this.stats.active--;
        this.stats.completed++;

        console.log(`[Queue] ✅ Job ${job.id} completed:`, result);
      } catch (error) {
        this.stats.active--;

        job.attempts++;

        if (job.attempts < job.maxAttempts) {
          // Retry with exponential backoff
          const delay = job.backoffDelay * Math.pow(2, job.attempts - 1);
          console.warn(
            `[Queue] ⚠️ Job ${job.id} failed (attempt ${job.attempts}/${job.maxAttempts}), retrying in ${delay}ms...`,
          );

          // Re-queue with delay
          await new Promise((resolve) => setTimeout(resolve, delay));
          this.jobs.unshift(job);
          this.stats.waiting++;
        } else {
          this.stats.failed++;
          console.error(
            `[Queue] ❌ Job ${job.id} failed after ${job.maxAttempts} attempts:`,
            error.message,
          );
        }
      }
    }

    this.processing = false;
  }

  async processJob(job) {
    const { postId, postData } = job.data;

    // Fetch user interests
    let userInterests = [];
    if (postData.userId) {
      const User = require("../models/user.model");
      const user = await User.findById(postData.userId).populate("interests");
      userInterests = user?.interests || [];
    }

    // Fetch place info
    let place = null;
    if (postData.placeId) {
      const Place = require("../models/place.model");
      place = await Place.findById(postData.placeId);
    }

    // Analyze with Gemini
    const analysisResult = await claudeService.analyzePostContent({
      content: postData.content,
      mediaUrl: postData.mediaUrl,
      place,
      userInterests,
    });

    console.log("\n========== POST ANALYSIS ==========");
    console.log("PostId     :", String(postId));
    console.log("Content    :", postData.content || "(no caption)");
    console.log(
      "Place      :",
      place ? `${place.name} (${place.category})` : "none",
    );
    console.log(
      "Interests  :",
      userInterests.map((i) => i.name || i).join(", ") || "none",
    );
    console.log(
      "Result     :",
      analysisResult
        ? JSON.stringify(analysisResult, null, 2)
        : "null (failed)",
    );
    console.log("====================================\n");

    if (!analysisResult) {
      throw new Error("Analysis failed - no result from Gemini");
    }

    // Save analysis to DB
    const analysis = await PostAnalysis.create({
      postId,
      topics: analysisResult.topics,
      confidence: analysisResult.confidence,
      summary: analysisResult.summary,
    });

    // Link analysis to post
    await Post.findByIdAndUpdate(postId, { analysisId: analysis._id });

    return {
      success: true,
      postId,
      analysisId: analysis._id,
    };
  }

  getStats() {
    return this.stats;
  }

  async clear() {
    this.jobs = [];
    this.stats = {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
    };
    console.log("[Queue] All jobs cleared");
  }
}

// Create singleton instance
const analysisQueue = new SimpleAnalysisQueue();

/**
 * Add post analysis to queue
 * Returns immediately, processing happens async
 */
const enqueuePostAnalysis = async (postId, postData) => {
  try {
    const job = await analysisQueue.add(
      { postId, postData },
      {
        attempts: 3,
        backoff: {
          delay: 2000, // 2s, 4s, 8s between retries
        },
      },
    );

    return job.id;
  } catch (error) {
    console.error(
      `[Queue] Error enqueuing post analysis for ${postId}:`,
      error.message,
    );
    return null;
  }
};

/**
 * Get queue stats
 */
const getQueueStats = async () => {
  return analysisQueue.getStats();
};

/**
 * Clear all jobs from queue
 */
const clearQueue = async () => {
  await analysisQueue.clear();
};

module.exports = {
  enqueuePostAnalysis,
  getQueueStats,
  clearQueue,
  analysisQueue,
};
