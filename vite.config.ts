/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react(),
  ],
  server: {
    host: "localhost",
    port: 5174,
    hmr: false,
    cors: true,
    headers: {
      "Access-Control-Allow-Origin": "http://localhost:8080",
      "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
    proxy: {
      "/api": {
        target: "http://localhost:9999",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, "/.netlify/functions"),
      },
      "/.netlify": {
        target: "http://localhost:9999",
        changeOrigin: true,
      },
    },
  },
});
