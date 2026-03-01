import client from "./client";

export const adminGetReports = async (params) => {
  const res = await client.get("/admin/reports", { params });
  return res.data; // {success, items, total, page, limit}
};

export const adminGetReportDetail = async (id) => {
  const res = await client.get(`/admin/reports/${id}`);
  return res.data; // {success, data}
};

export const adminHandleReport = async (id, payload) => {
  const res = await client.patch(`/admin/reports/${id}/handle`, payload);
  return res.data; // {success, data}
};
