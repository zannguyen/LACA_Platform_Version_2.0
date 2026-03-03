const mongoose = require("mongoose");
const service = require("../services/reaction.service");
const Post = require("../models/post.model");
const User = require("../models/user.model");
const Follow = require("../models/follow.model");
const Place = require("../models/place.model");
const UserService = require("../services/user.service");
const notifService = require("../services/notification.service");

// Calculate distance between two coordinates in km
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

const REACTION_LABELS = {
  like: "thích",
  love: "yêu thích",
  haha: "haha",
  wow: "wow",
  sad: "buồn",
  angry: "tức giận",
  heart: "tim",
};

const react = async (req, res) => {
  try {
    console.log("[Reaction] Request body:", req.body);
    console.log("[Reaction] User:", req.user?.id);

    const post = await Post.findById(req.body.postId).select("userId placeId");
    console.log("[Reaction] Post found:", post?._id, "placeId:", post?.placeId);

    if (!post) return res.status(404).json({ message: "Post not found" });

    const currentUserId = req.user.id;
    const postAuthorId = post.userId.toString();
    console.log("[Reaction] Current user:", currentUserId, "Post author:", postAuthorId);

    // 1. Allow reaction to own post
    if (String(post.userId) === currentUserId) {
      console.log("[Reaction] Reacting to own post");
      const data = await service.reactPost(
        req.body.postId,
        currentUserId,
        req.body.type,
      );
      return res.json(data);
    }

    const postAuthor = await User.findById(postAuthorId)
      .select("privacyData")
      .lean();
    if (postAuthor?.privacyData?.allowPeopleInteraction === false) {
      return res
        .status(403)
        .json({ message: "Người dùng này đã tắt tương tác cho bài viết" });
    }

    const blocked = await UserService.isBlocked(
      currentUserId,
      postAuthorId,
    );

    if (blocked) {
      return res
        .status(403)
        .json({ message: "You cannot interact with this user" });
    }

    // 2. Check if current user is following the post author
    const isFollowing = await Follow.findOne({
      followerUserId: new mongoose.Types.ObjectId(currentUserId),
      followingUserId: new mongoose.Types.ObjectId(postAuthorId),
    });

    if (isFollowing) {
      // If following, allow reaction without distance restriction
      const data = await service.reactPost(
        req.body.postId,
        currentUserId,
        req.body.type,
      );
      return res.json(data);
    }

    // 3. Not following - check if post is within 5km
    if (post.placeId && mongoose.Types.ObjectId.isValid(post.placeId)) {
      const place = await Place.findById(new mongoose.Types.ObjectId(post.placeId)).select("location");
      if (place && place.location && place.location.coordinates) {
        const postLng = place.location.coordinates[0];
        const postLat = place.location.coordinates[1];

        // Get current user's location from request body
        const userLat = req.body.lat;
        const userLng = req.body.lng;

        if (userLat && userLng) {
          const distance = getDistanceFromLatLonInKm(userLat, userLng, postLat, postLng);

          if (distance > 5) {
            return res.status(403).json({
              message: "Bạn chỉ có thể tương tác với bài viết trong phạm vi 5km hoặc theo dõi người đăng"
            });
          }
        }
      }
    }

    // Allow reaction if no place or within 5km
    const data = await service.reactPost(
      req.body.postId,
      currentUserId,
      req.body.type,
    );

    // Notify post owner (fire & forget, skip if reacting to own post)
    if (String(post.userId) !== currentUserId) {
      try {
        const io = req.app.get("io");
        const reactor = await User.findById(currentUserId).select(
          "fullname username",
        );
        const reactorName = reactor?.fullname || reactor?.username || "Ai đó";
        const label =
          REACTION_LABELS[req.body.type] || req.body.type || "reaction";

        await notifService.createAndEmit(io, {
          recipientId: post.userId,
          senderId: currentUserId,
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
  } catch (error) {
    console.error("Reaction error:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

const count = async (req, res) => {
  const total = await service.countReaction(req.params.postId);
  res.json({ total });
};

const unreact = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const postId = req.params.postId;

    console.log("[Unreact] User:", currentUserId, "Post:", postId);

    const result = await service.removeReaction(postId, currentUserId);

    if (!result) {
      return res.status(404).json({ message: "Reaction not found" });
    }

    res.json({ message: "Reaction removed", success: true });
  } catch (error) {
    console.error("Unreact error:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

const getReactionStatus = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const postId = req.params.postId;

    const reaction = await service.getUserReaction(postId, currentUserId);

    res.json({ reacted: !!reaction, type: reaction?.type || null });
  } catch (error) {
    console.error("getReactionStatus error:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

module.exports = { react, count, unreact, getReactionStatus };
