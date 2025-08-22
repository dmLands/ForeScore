// drizzle.config.ts — dotenv-free: reads .env manually, falls back to local URL
import { defineConfig } from "drizzle-kit";
import fs from "node:fs";
import path from "node:path";

function readEnvVar(name: string, fallback = ""): string {
  const env = process.env[name];
  if (env && env.trim() !== "") return env.trim();
  try {
    const p = path.resolve(process.cwd(), ".env");
    const txt = fs.readFileSync(p, "utf8");
    for (const raw of txt.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (m && m[1] === name) {
        let v = m[2].trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1);
        }
        return v;
      }
    }
  } catch {}
  return fallback;
}

const url = readEnvVar("DATABASE_URL", "postgres://forescore:forescore@localhost:5432/forescore");

export default defineConfig({
  dialect: "postgresql",
  schema: "./shared/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
});
