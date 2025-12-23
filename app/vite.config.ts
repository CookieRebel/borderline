import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import type { PreRenderedAsset } from "rollup";


export default defineConfig(({ command }) => {
  const isBuild = command === "build";

  return {
    plugins: [react()],

    // DEV ONLY (your current setup)
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
          rewrite: (p) => p.replace(/^\/api/, "/.netlify/functions"),
        },
        "/.netlify": {
          target: "http://localhost:9999",
          changeOrigin: true,
        },
      },
    },

    // BUILD ONLY (embed bundle for Eleventy)
    ...(isBuild
      ? {
        base: "/assets/app/",
        build: {
          outDir: path.resolve(__dirname, "../dist/assets/app"),
          emptyOutDir: true,
          sourcemap: false,
          cssCodeSplit: false,
          rollupOptions: {
            input: path.resolve(__dirname, "src/embed.tsx"),
            output: {
              format: "es",
              entryFileNames: "borderline-embed.js",
              chunkFileNames: "assets/[name]-[hash].js",
              assetFileNames: (assetInfo: PreRenderedAsset) => {
                // make CSS predictable
                if (assetInfo.name?.endsWith(".css")) return "borderline-embed.css";
                // keep other assets hashed
                return "assets/[name]-[hash][extname]";
              },
            },
          },
        }


      }
      : {}),
  };
});
