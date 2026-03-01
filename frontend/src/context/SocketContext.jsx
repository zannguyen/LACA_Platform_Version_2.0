// frontend/src/context/SocketContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import io from "socket.io-client";
import { SOCKET_URL } from "../config/socket";

const SocketContext = createContext();

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Get user from localStorage
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const userId = user?._id || user?.id;

    if (!userId) return;

    // Connect to Socket.IO
    const newSocket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    // Setup event listeners
    newSocket.on("connect", () => {
      console.log("Socket connected:", newSocket.id);
      // Emit setup event to join user's room
      newSocket.emit("setup", { _id: userId, id: userId, userId });
    });

    newSocket.on("connected", () => {
      console.log("User room joined");
    });

    newSocket.on("notification", (data) => {
      console.log("Notification received in SocketContext:", data);
      // Dispatch refresh event for notification page
      window.dispatchEvent(
        new CustomEvent("refreshNotifications", { detail: data })
      );
      // Show browser notification if supported
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(data.title || "New Notification", {
          body: data.body || "",
          icon: "/laca_logo.png",
        });
      }
    });

    newSocket.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
