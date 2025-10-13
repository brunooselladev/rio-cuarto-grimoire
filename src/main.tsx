import { createRoot } from "react-dom/client";
import { POIProvider } from "./contexts/POIContext";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <POIProvider>
    <App />
  </POIProvider>
);
