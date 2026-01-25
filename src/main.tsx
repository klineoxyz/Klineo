import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";
import { initAnalytics } from "./lib/analytics";
import { AuthProvider } from "./app/contexts/AuthContext";

initAnalytics();

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
  