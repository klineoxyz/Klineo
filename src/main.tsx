import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./app/App.tsx";
import "./styles/index.css";
import { initAnalytics } from "./lib/analytics";
import { AuthProvider } from "./app/contexts/AuthContext";
import { DemoProvider } from "./app/contexts/DemoContext";

initAnalytics();

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <AuthProvider>
      <DemoProvider>
        <App />
      </DemoProvider>
    </AuthProvider>
  </BrowserRouter>
);
  