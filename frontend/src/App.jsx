import "./App.css";
import AppRoutes from "./routes/index.jsx";
import { LocationAccessProvider, useLocationAccess } from "./context/LocationAccessContext.jsx";
import { SocketProvider } from "./context/SocketContext.jsx";
import NotificationListener from "./components/NotificationListener.jsx";
import { useState } from "react";
import { useLocation } from "react-router-dom";
import Chatbot, { ChatbotFloatingButton } from "./components/chatbot/Chatbot.jsx";
// sẽ tự lấy routes/index.jsx

function ChatbotWrapper() {
  const { lastPosition, enabled } = useLocationAccess();
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const locationRouter = useLocation();

  // Only show chatbot on Home and Map pages
  const showChatbot = locationRouter.pathname === "/home" || locationRouter.pathname === "/map";

  if (!showChatbot) return null;

  // Only show location warning if enabled but no position yet
  const showLocationWarning = enabled && !lastPosition;

  return (
    <div className="chatbot-wrapper">
      <ChatbotFloatingButton onClick={() => setChatbotOpen(true)} />
      <Chatbot
        isOpen={chatbotOpen}
        onClose={() => setChatbotOpen(false)}
        userLocation={lastPosition}
        showLocationWarning={showLocationWarning}
      />
    </div>
  );
}

export default function App() {
  return (
    <div className="laca-app">
      <div className="laca-container" style={{ position: "relative" }}>
        <SocketProvider>
          <NotificationListener />
          <LocationAccessProvider>
            <AppRoutes />
            <ChatbotWrapper />
          </LocationAccessProvider>
        </SocketProvider>
      </div>
    </div>
  );
}
