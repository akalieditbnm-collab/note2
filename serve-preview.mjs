/**
 * Local UI preview harness (not part of the desktop app).
 *
 * Serves the real React application in a browser with `@tauri-apps/api`
 * replaced by `src/dev/tauriMock.ts`, so Arabic/RTL layout changes can be
 * reviewed without building the Tauri binary.
 *
 * Usage: node serve-preview.mjs   →  http://localhost:4173/src/dev/preview.html
 */
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

const app = path.resolve(import.meta.dirname ?? ".", ".");
const mockApi = path.join(app, "src/dev/tauriMock.ts");

const tauriMockPlugin = {
  name: "tauri-api-mock",
  enforce: "pre",
  resolveId(id) {
    if (id === "@tauri-apps/api" || id.startsWith("@tauri-apps/api/")) {
      return mockApi;
    }
    return null;
  },
};

const server = await createServer({
  configFile: false,
  root: app,
  plugins: [tauriMockPlugin, react()],
  server: {
    port: 4173,
    strictPort: true,
    host: true,
    allowedHosts: true,
  },
});

await server.listen();
console.log("UI preview ready:", server.resolvedUrls);
