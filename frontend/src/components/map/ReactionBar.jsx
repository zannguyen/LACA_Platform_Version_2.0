import React, { useState } from "react";
import { addReaction, removeReaction } from "../../api/map.api";
import "./ReactionBar.css";

const REACTIONS = [
  { type: "love", emoji: "❤️", label: "Yêu thích" },
  { type: "fire", emoji: "🔥", label: "Tuyệt vời" },
  { type: "laugh", emoji: "😂", label: "Hài hước" },
  { type: "wow", emoji: "😮", label: "Wow" },
];

const ReactionBar = ({ photoId, reactions, checkInId }) => {
  const [currentReactions, setCurrentReactions] = useState(reactions || {});
  const [userReaction, setUserReaction] = useState(null); // Reaction của user hiện tại
  const [isAnimating, setIsAnimating] = useState(false);

  /**
   * Xử lý khi user click vào reaction
   */
  const handleReactionClick = async (reactionType) => {
    if (isAnimating) return;

    setIsAnimating(true);

    // Nếu đã react cùng loại -> bỏ reaction
    if (userReaction === reactionType) {
      const result = await removeReaction(photoId, reactionType);
      if (result.success) {
        setCurrentReactions((prev) => ({
          ...prev,
          [reactionType]: Math.max(0, (prev[reactionType] || 0) - 1),
        }));
        setUserReaction(null);
      }
    } else {
      // Nếu đã react loại khác -> xóa cái cũ trước
      if (userReaction) {
        await removeReaction(photoId, userReaction);
        setCurrentReactions((prev) => ({
          ...prev,
          [userReaction]: Math.max(0, (prev[userReaction] || 0) - 1),
        }));
      }

      // Thêm reaction mới
      const result = await addReaction(photoId, reactionType);
      if (result.success) {
        setCurrentReactions((prev) => ({
          ...prev,
          [reactionType]: (prev[reactionType] || 0) + 1,
        }));
        setUserReaction(reactionType);
      }
    }

    setTimeout(() => setIsAnimating(false), 300);
  };

  /**
   * Tính tổng số reactions
   */
  const getTotalReactions = () => {
    return Object.values(currentReactions).reduce(
      (sum, count) => sum + count,
      0,
    );
  };

  return (
    <div className="reaction-bar">
      {/* Reaction buttons */}
      <div className="reaction-buttons">
        {REACTIONS.map((reaction) => {
          const count = currentReactions[reaction.type] || 0;
          const isActive = userReaction === reaction.type;

          return (
            <button
              key={reaction.type}
              className={`reaction-btn ${isActive ? "active" : ""} ${
                isAnimating ? "animating" : ""
              }`}
              onClick={() => handleReactionClick(reaction.type)}
              title={reaction.label}
            >
              <span className="reaction-emoji">{reaction.emoji}</span>
              {count > 0 && <span className="reaction-count">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Total reactions */}
      {getTotalReactions() > 0 && (
        <div className="total-reactions">{getTotalReactions()} cảm xúc</div>
      )}

      {/* Reaction animation overlay */}
      {isAnimating && (
        <div className="reaction-animation">
          <span className="floating-emoji">
            {REACTIONS.find((r) => r.type === userReaction)?.emoji}
          </span>
        </div>
      )}
    </div>
  );
};

export default ReactionBar;
