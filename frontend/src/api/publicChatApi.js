import { api } from "./client";

/**
 * Join or create public chat for a post
 * POST /api/chat/public/join/:postId
 */
export const joinPublicChat = async (postId) => {
  const res = await api.post(`/chat/public/join/${postId}`);
  return res.data;
};

/**
 * Get all messages for a post chat
 * GET /api/chat/public/:postId
 */
export const getPublicMessages = async (postId) => {
  const res = await api.get(`/chat/public/${postId}`);
  return res.data;
};

/**
 * Send message to post chat
 * POST /api/chat/public/send
 */
export const sendPublicMessage = async (postId, text, image) => {
  const res = await api.post(`/chat/public/send`, {
    postId,
    text,
    image,
  });
  return res.data;
};

/**
 * Get participants in post chat
 * GET /api/chat/public/:postId/participants
 */
export const getPublicParticipants = async (postId) => {
  const res = await api.get(`/chat/public/${postId}/participants`);
  return res.data;
};

/**
 * Leave post chat
 * POST /api/chat/public/:postId/leave
 */
export const leavePublicChat = async (postId) => {
  const res = await api.post(`/chat/public/${postId}/leave`);
  return res.data;
};
