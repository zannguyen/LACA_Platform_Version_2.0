import client from "./client";

export const createReport = async (reportData) => {
  const res = await client.post("/reports", reportData);
  return res.data;
};
