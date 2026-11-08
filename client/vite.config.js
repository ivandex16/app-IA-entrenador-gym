import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      "/api": "http://localhost:5000",
    },
    allowedHosts: [
      "d697-186-99-139-77.ngrok-free.app",
      ".ngrok-free.app",
    ],
  },
});
