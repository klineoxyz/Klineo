
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";
  import { initAnalytics } from "./lib/analytics";

  // Initialize analytics (only runs in production if env vars are set)
  initAnalytics();

  createRoot(document.getElementById("root")!).render(<App />);
  