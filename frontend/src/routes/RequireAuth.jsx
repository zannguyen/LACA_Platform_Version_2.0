import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import api from "../api/client";

const getStoredToken = () =>
  localStorage.getItem("token") || localStorage.getItem("authToken");

const parseJwtPayload = (token) => {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return null;

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "=",
    );
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
};

const isTokenValid = (token) => {
  if (!token) return false;
  const payload = parseJwtPayload(token);
  if (!payload || !payload.exp) return true;
  return payload.exp * 1000 > Date.now();
};

export default function RequireAuth({ children }) {
  const location = useLocation();
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    let isActive = true;
    const token = getStoredToken();

    if (isTokenValid(token)) {
      setStatus("authed");
      return () => {
        isActive = false;
      };
    }

    const refresh = async () => {
      try {
        const res = await api.post("/auth/refresh-token");
        const newToken = res?.data?.accessToken || res?.data?.data?.accessToken;

        if (newToken) {
          localStorage.setItem("token", newToken);
          localStorage.setItem("authToken", newToken);
          if (isActive) setStatus("authed");
          return;
        }
      } catch (error) {
        // fall through to guest state
      }

      localStorage.removeItem("token");
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      if (isActive) setStatus("guest");
    };

    refresh();

    return () => {
      isActive = false;
    };
  }, []);

  if (status === "checking") return null;

  if (status !== "authed") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
