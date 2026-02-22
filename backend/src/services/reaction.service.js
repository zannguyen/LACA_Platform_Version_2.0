const Reaction = require("../models/reaction.model");

const reactPost = (postId, userId, type) => {
  return Reaction.findOneAndUpdate(
    { postId, userId },
    { $set: { postId, userId, type } },
    { upsert: true, new: true },
  );
};

const countReaction = (postId) => {
  return Reaction.countDocuments({ postId });
};

module.exports = { reactPost, countReaction };
