import React, { useEffect, useState } from "react";
import "./ContentModeration.css";

const MOCK_REPORTS = [
  {
    id: 1,
    reason: "SPAM",
    reasonKey: "spam",
    post: {
      thumbnail: null,
    },
    user: {
      name: "USER A",
      email: "usera@gmail.com",
    },
  },
  {
    id: 2,
    reason: "HATE SPEECH",
    reasonKey: "hate",
    post: {
      thumbnail: null,
    },
    user: {
      name: "USER A",
      email: "usera@gmail.com",
    },
  },
  {
    id: 3,
    reason: "NSFW CONTENT",
    reasonKey: "nsfw",
    post: {
      thumbnail: null,
    },
    user: {
      name: "USER A",
      email: "usera@gmail.com",
    },
  },
  {
    id: 4,
    reason: "IMPERSONATION",
    reasonKey: "impersonation",
    post: {
      thumbnail: null,
    },
    user: {
      name: "USER A",
      email: "usera@gmail.com",
    },
  },
];

const ContentModeration = () => {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    // mock API
    setReports(MOCK_REPORTS);
  }, []);

  return (
    <div className="moderation-container">
      <table className="moderation-table">
        <thead>
          <tr>
            <th>Reported posts</th>
            <th>User</th>
            <th>Reason</th>
            <th>ACTIONS</th>
          </tr>
        </thead>

        <tbody>
          {reports.map((r) => (
            <tr key={r.id}>
              <td>
                <div className="report-preview" />
              </td>

              <td>
                <div className="user-cell">
                  <div className="user-avatar" />
                  <div className="user-info">
                    <span className="user-name">{r.user.name}</span>
                    <span className="user-email">{r.user.email}</span>
                  </div>
                </div>
              </td>

              <td>
                <span className={`reason-tag reason-${r.reasonKey}`}>
                  {r.reason}
                </span>
              </td>

              <td>
                <div className="action-buttons">
                  <button>VIEW</button>
                  <button>EDIT</button>
                  <button className="btn-block">BLOCK</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {reports.length === 0 && (
        <div className="empty-state">No reported content</div>
      )}
    </div>
  );
};

export default ContentModeration;
