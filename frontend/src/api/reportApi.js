import client from "./client";

export const createReport = async (payload) => {
  // payload: { targetType, targetId, category, reason, description }
  const res = await client.post("/reports", payload);
  return res.data;
};
