const service = require("../services/reaction.service");
const Post = require("../models/post.model");
const User = require("../models/user.model");
const UserService = require("../services/user.service");
const notifService = require("../services/notification.service");

const REACTION_LABELS = {
  like: "thích",
  love: "yêu thích",
  haha: "haha",
  wow: "wow",
  sad: "buồn",
  angry: "tức giận",
};

const react = async (req, res) => {
  const post = await Post.findById(req.body.postId).select("userId");
  if (!post) return res.status(404).json({ message: "Post not found" });

  const blocked = await UserService.isBlocked(
    req.user.id,
    post.userId.toString(),
  );

  if (blocked) {
    return res
      .status(403)
      .json({ message: "You cannot interact with this user" });
  }

  const data = await service.reactPost(
    req.body.postId,
    req.user.id,
    req.body.type,
  );

  // Notify post owner (fire & forget, skip if reacting to own post)
  if (String(post.userId) !== String(req.user.id)) {
    try {
      const io = req.app.get("io");
      const reactor = await User.findById(req.user.id).select(
        "fullname username",
      );
      const reactorName = reactor?.fullname || reactor?.username || "Ai đó";
      const label =
        REACTION_LABELS[req.body.type] || req.body.type || "reaction";

      await notifService.createAndEmit(io, {
        recipientId: post.userId,
        senderId: req.user.id,
        type: "new_reaction",
        title: `${reactorName} đã ${label} bài viết của bạn`,
        body: "",
        link: `/posts/${req.body.postId}`,
        refId: req.body.postId,
        refModel: "Post",
      });
    } catch (notifErr) {
      console.error("[Notification] new_reaction error:", notifErr.message);
    }
  }

  res.json(data);
};

const count = async (req, res) => {
  const total = await service.countReaction(req.params.postId);
  res.json({ total });
};

module.exports = { react, count };
