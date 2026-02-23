import "./App.css";
import AppRoutes from "./routes/index.jsx";
import { LocationAccessProvider } from "./context/LocationAccessContext.jsx";
import { SocketProvider } from "./context/SocketContext.jsx";
import NotificationListener from "./components/NotificationListener.jsx";
// sẽ tự lấy routes/index.jsx

export default function App() {
  return (
    <div className="laca-app">
      <div className="laca-container">
        <SocketProvider>
          <NotificationListener />
          <LocationAccessProvider>
            <AppRoutes />
          </LocationAccessProvider>
        </SocketProvider>
      </div>
    </div>
  );
}
