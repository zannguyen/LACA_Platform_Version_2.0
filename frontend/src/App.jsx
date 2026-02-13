import "./App.css";
import AppRoutes from "./routes/index.jsx";
import { LocationAccessProvider } from "./context/LocationAccessContext.jsx";
// sẽ tự lấy routes/index.jsx

export default function App() {
  return (
    <div className="laca-app">
      <div className="laca-container">
        <LocationAccessProvider>
        <AppRoutes />
      </LocationAccessProvider>
      </div>
    </div>
  );
}
