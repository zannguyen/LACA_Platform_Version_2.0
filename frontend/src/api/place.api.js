// src/api/place.api.js
import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:4000/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

apiClient.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("authToken") || localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const parseErr = (e) =>
  e?.response?.data?.message || e?.message || "Request failed";

export const suggestPlaces = async (
  lat,
  lng,
  radius = 250,
  limit = 12,
  query = "",
) => {
  try {
    const res = await apiClient.get("/places/suggest", {
      params: { lat, lng, radius, limit, query },
    });
    return res.data; // {success,count,data:[...]}
  } catch (e) {
    return { success: false, message: parseErr(e), data: [] };
  }
};

export const reverseGeocode = async (lat, lng) => {
  try {
    const res = await apiClient.get("/places/reverse", {
      params: { lat, lng },
    });
    return res.data; // {success,data:{name,address}}
  } catch (e) {
    return { success: false, message: parseErr(e), data: null };
  }
};

export const resolvePlace = async ({
  lat,
  lng,
  name,
  address,
  category,
  googlePlaceId,
  forceCreate = false,
}) => {
  try {
    const res = await apiClient.post("/places/resolve", {
      lat,
      lng,
      name,
      address,
      category,
      googlePlaceId,
      forceCreate,
    });
    return res.data; // {success,data: PlaceDoc(with _id)}
  } catch (e) {
    return { success: false, message: parseErr(e), data: null };
  }
};
