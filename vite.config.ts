// vite.config.ts (portable, no Replit deps)
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;

// If your React app is NOT in ./client, change "client" below to your web folder.
export default defineConfig({
  plugins: [react()],
  root: path.resolve(ROOT, "client"),
  publicDir: path.resolve(ROOT, "client/public"),
  build: {
    outDir: path.resolve(ROOT, "dist/public"), // server can serve from ./dist/public
    emptyOutDir: true,
  },
  server: {
    host: true,
    port: 5173,
    fs: {
      // Allow importing from shared/ when root is client/
      allow: [
        path.resolve(ROOT, "client"),
        path.resolve(ROOT, "shared"),
        ROOT, // repo root
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(ROOT, "client/src"),
      "@shared": path.resolve(ROOT, "shared"),
    },
  },
});
