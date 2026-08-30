import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
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
