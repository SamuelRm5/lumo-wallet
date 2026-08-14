import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App.jsx";
import "./index.css";

// Listener global para auto-logout cuando el token expira
window.addEventListener("auth:token-expired", () => {
  console.log("Token expirado detectado, recargando página...");
  window.location.reload();
});

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
