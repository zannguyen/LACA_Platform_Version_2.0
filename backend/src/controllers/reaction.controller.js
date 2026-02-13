const service = require("../services/reaction.service");
const Post = require("../models/post.model");
const UserService = require("../services/user.service");

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
  res.json(data);
};

const count = async (req, res) => {
  const total = await service.countReaction(req.params.postId);
  res.json({ total });
};

module.exports = { react, count };
