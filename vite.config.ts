import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

// --- paths
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const CLIENT = path.resolve(ROOT, "client");

// --- tiny debug plugin to print what Vite actually uses
const printAliases = {
  name: "print-aliases",
  configResolved(cfg: any) {
    const map = Object.fromEntries(
      cfg.resolve.alias.map((a: any) => [
        a.find,
        typeof a.replacement === "string" ? a.replacement : "(fn)",
      ])
    );
    console.log("🔎 Vite alias map:", map);
  },
};

export default defineConfig({
  plugins: [
    printAliases,   // <— keep first
    react(),
  ],
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
