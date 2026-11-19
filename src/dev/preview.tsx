import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "../App";
import "../styles.css";
import "../motion.css";

/**
 * Entry point for the browser UI preview (`npm run preview:ui`).
 * Tauri IPC is replaced by `./tauriMock.ts` through a Vite alias.
 */
const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
