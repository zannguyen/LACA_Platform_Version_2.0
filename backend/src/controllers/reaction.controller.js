const service = require("../services/reaction.service");

const react = async (req, res) => {
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
