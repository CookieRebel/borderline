import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react(),
  ],
  server: {
    host: "localhost",
    port: 5174,
    hmr: false, // Turn of Hot Module Replacement
    // Make module imports from Eleventy (8080) legal
    cors: true,
    headers: {
      "Access-Control-Allow-Origin": "http://localhost:8080",
      "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
    proxy: {
      // If your frontend calls /api/leaderboard, /api/game, etc.
      "/api": {
        target: "http://localhost:9999",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, "/.netlify/functions"),
      },

      // If your frontend calls /.netlify/functions/* directly
      "/.netlify": {
        target: "http://localhost:9999",
        changeOrigin: true,
      },
    },
  },
});
