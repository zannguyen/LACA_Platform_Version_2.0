import React from "react";
import "./PublicChat.css";

const PublicChatParticipants = ({ participants, loading }) => {
  if (loading) {
    return (
      <div className="public-chat-participants-container">
        <div className="public-chat-participants-header">
          <i className="fa-solid fa-users"></i> Người tham gia
        </div>
        <div className="public-chat-participants-loading">
          <i className="fa-solid fa-spinner fa-spin"></i>
        </div>
      </div>
    );
  }

  return (
    <div className="public-chat-participants-container">
      <div className="public-chat-participants-header">
        <i className="fa-solid fa-users"></i> Người tham gia ({participants.length})
      </div>
      <div className="public-chat-participants-list">
        {participants.length === 0 ? (
          <div className="public-chat-participants-empty">
            Chưa có ai tham gia
          </div>
        ) : (
          participants.map((participant) => (
            <div key={participant._id} className="public-chat-participant-item">
              <div className="public-chat-participant-avatar">
                {participant.avatar ? (
                  <img src={participant.avatar} alt={participant.username} />
                ) : (
                  <i className="fa-solid fa-user"></i>
                )}
              </div>
              <div className="public-chat-participant-info">
                <div className="public-chat-participant-name">
                  {participant.fullname || participant.username}
                </div>
                <div className="public-chat-participant-username">
                  @{participant.username}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PublicChatParticipants;
