import axiosClient from "./client";

const rankingApi = {
  getFeaturedRanking: () => axiosClient.get("/ranking/featured"),
};

export default rankingApi;
