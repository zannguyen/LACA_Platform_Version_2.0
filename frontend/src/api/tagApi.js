import client from "./client";

// Lấy tất cả categories với tags
export const getCategoriesWithTags = () => client.get("/tags/categories");

// Lấy tags theo category
export const getTagsByCategory = (categoryId) =>
  client.get(`/tags/by-category/${categoryId}`);

// Tìm kiếm tags
export const searchTags = (query) =>
  client.get(`/tags/search/all?q=${encodeURIComponent(query)}`);

export default {
  getCategoriesWithTags,
  getTagsByCategory,
  searchTags,
};
