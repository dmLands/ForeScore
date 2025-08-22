// drizzle.config.ts (points to your repo's shared/schema.ts)
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./shared/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    // .env/.env.example must define DATABASE_URL
    url: process.env.DATABASE_URL ?? "",
  },
});
