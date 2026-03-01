const mongoose = require("mongoose");

const reactPost = async (postId, userId, type = "like") => {
  try {
    const postObjectId = new mongoose.Types.ObjectId(postId);
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Use raw MongoDB collection to bypass Mongoose validation
    const db = mongoose.connection.db;
    const reactionsCollection = db.collection("reactions");

    // Try to find existing
    const existing = await reactionsCollection.findOne({
      postId: postObjectId,
      userId: userObjectId
    });

    if (existing) {
      // Update existing
      const result = await reactionsCollection.updateOne(
        { postId: postObjectId, userId: userObjectId },
        { $set: { type: type } }
      );
      return await reactionsCollection.findOne({ postId: postObjectId, userId: userObjectId });
    } else {
      // Insert new
      const result = await reactionsCollection.insertOne({
        postId: postObjectId,
        userId: userObjectId,
        type: type,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      return await reactionsCollection.findOne({ _id: result.insertedId });
    }
  } catch (error) {
    console.error("reactPost error:", error);
    throw error;
  }
};

const countReaction = async (postId) => {
  try {
    const db = mongoose.connection.db;
    const reactionsCollection = db.collection("reactions");
    const count = await reactionsCollection.countDocuments({
      postId: new mongoose.Types.ObjectId(postId)
    });
    return count;
  } catch (error) {
    console.error("countReaction error:", error);
    return 0;
  }
};

const removeReaction = async (postId, userId) => {
  try {
    const db = mongoose.connection.db;
    const reactionsCollection = db.collection("reactions");

    const result = await reactionsCollection.deleteOne({
      postId: new mongoose.Types.ObjectId(postId),
      userId: new mongoose.Types.ObjectId(userId)
    });

    return result.deletedCount > 0;
  } catch (error) {
    console.error("removeReaction error:", error);
    throw error;
  }
};

const getUserReaction = async (postId, userId) => {
  try {
    const db = mongoose.connection.db;
    const reactionsCollection = db.collection("reactions");

    const reaction = await reactionsCollection.findOne({
      postId: new mongoose.Types.ObjectId(postId),
      userId: new mongoose.Types.ObjectId(userId)
    });

    return reaction;
  } catch (error) {
    console.error("getUserReaction error:", error);
    return null;
  }
};

module.exports = { reactPost, countReaction, removeReaction, getUserReaction };
