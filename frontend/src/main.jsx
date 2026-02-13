import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./App.css";
import { getLocationAllowedFromLS, setGeolocationAllowed } from "./services/geolocationGate";

// Apply in-app geolocation gate BEFORE React renders.
setGeolocationAllowed(getLocationAllowedFromLS());

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
