import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const CLIENT = path.resolve(ROOT, "client");

// debug plugin — prints what Vite is *actually* using
const printAliases = {
  name: "print-aliases",
  configResolved(cfg: any) {
    const pretty = cfg.resolve.alias.map((a: any) => {
      const find = a.find instanceof RegExp ? a.find.toString() : String(a.find);
      const repl =
        typeof a.replacement === "string" ? a.replacement : "(function)";
      return `${find} → ${repl}`;
    });
    console.log("🔎 Vite aliases:\n  " + pretty.join("\n  "));
  },
};

export default defineConfig({
  plugins: [printAliases, react()],
  root: CLIENT,
  publicDir: path.resolve(CLIENT, "public"),
  build: {
    outDir: path.resolve(ROOT, "dist/public"),
    emptyOutDir: true,
  },
  server: { host: true, port: 5173 },
  resolve: {
    alias: [
      // 👇 regex so "@/..." **always** matches
      { find: /^@\//, replacement: path.resolve(CLIENT, "src/") + "/" },
      { find: /^@shared\//, replacement: path.resolve(ROOT, "shared/") + "/" },
    ],
  },
});
