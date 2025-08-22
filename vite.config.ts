import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const CLIENT = path.resolve(ROOT, "client");

export default defineConfig({
  plugins: [react()],
  root: CLIENT,
  publicDir: path.resolve(CLIENT, "public"),
  build: {
    outDir: path.resolve(ROOT, "dist/public"),
    emptyOutDir: true,
  },
  server: { host: true, port: 5173 },
  resolve: {
    alias: {
      "@": path.resolve(CLIENT, "src"),
      "@shared": path.resolve(ROOT, "shared"),
    },
  },
});
