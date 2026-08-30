import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import profileHandler from "./api/profile.js";

function profileApi() {
  return {
    name: "profile-api",
    configureServer(server) {
      server.middlewares.use("/api/profile", (req, res) => {
        req.url = req.url && req.url.startsWith("/api/profile") ? req.url : `/api/profile${req.url || ""}`;
        profileHandler(req, res);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use("/api/profile", (req, res) => {
        req.url = req.url && req.url.startsWith("/api/profile") ? req.url : `/api/profile${req.url || ""}`;
        profileHandler(req, res);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), profileApi()],
  define: {
    global: "globalThis",
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/api/ipfs": {
        target: "https://gateway.pinata.cloud",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ipfs/, "/ipfs"),
      },
    },
  },
});
