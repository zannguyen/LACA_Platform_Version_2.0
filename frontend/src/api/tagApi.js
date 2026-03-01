import client from "./client";

// Lấy tất cả categories với tags
export const getCategoriesWithTags = () => client.get("/tags/categories");

// Lấy tags theo category
export const getTagsByCategory = (categoryId) =>
  client.get(`/tags/by-category/${categoryId}`);

// Tìm kiếm tags
export const searchTags = (query) =>
  client.get(`/tags/search/all?q=${encodeURIComponent(query)}`);

// ============ ADMIN APIs (require auth) ============
// Token đã được thêm tự động bởi axios interceptor trong client.js

// Category CRUD
export const createCategory = (data) =>
  client.post("/tags/categories", data);

export const updateCategory = (categoryId, data) =>
  client.put(`/tags/categories/${categoryId}`, data);

export const deleteCategory = (categoryId) =>
  client.delete(`/tags/categories/${categoryId}`);

// Tag CRUD
export const createTag = (categoryId, data) =>
  client.post(`/tags/categories/${categoryId}/tags`, data);

export const updateTag = (tagId, data) =>
  client.put(`/tags/${tagId}`, data);

export const deleteTag = (tagId) =>
  client.delete(`/tags/${tagId}`);

export default {
  getCategoriesWithTags,
  getTagsByCategory,
  searchTags,
  createCategory,
  updateCategory,
  deleteCategory,
  createTag,
  updateTag,
  deleteTag,
};
