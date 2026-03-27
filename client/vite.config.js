import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/api": process.env.BACKEND_URL || "http://localhost:5000",
    },
    allowedHosts: ["a819-181-207-3-18.ngrok-free.app"],
  },
});
