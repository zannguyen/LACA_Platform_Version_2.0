const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    postId: mongoose.Schema.Types.ObjectId,
    userId: mongoose.Schema.Types.ObjectId,
    type: String,
  },
  { timestamps: true },
);

module.exports = mongoose.model("Reaction", schema);
