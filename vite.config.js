import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/api": "http://127.0.0.1:8000" } },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes("node_modules") &&
            /recharts|d3-|victory-vendor|decimal.js|eventemitter3|react-smooth/.test(
              id,
            )
          )
            return "charts";
        },
      },
    },
  },
});
