import "./App.css";
import AppRoutes from "./routes/index.jsx";
import { LocationAccessProvider, useLocationAccess } from "./context/LocationAccessContext.jsx";
import { SocketProvider } from "./context/SocketContext.jsx";
import NotificationListener from "./components/NotificationListener.jsx";
import { useState } from "react";
import Chatbot, { ChatbotFloatingButton } from "./components/chatbot/Chatbot.jsx";
// sẽ tự lấy routes/index.jsx

function ChatbotWrapper() {
  const { location } = useLocationAccess();
  const [chatbotOpen, setChatbotOpen] = useState(false);

  return (
    <>
      <ChatbotFloatingButton onClick={() => setChatbotOpen(true)} />
      <Chatbot
        isOpen={chatbotOpen}
        onClose={() => setChatbotOpen(false)}
        userLocation={location}
      />
    </>
  );
}

export default function App() {
  return (
    <div className="laca-app">
      <div className="laca-container">
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
