// server/db.ts — pg-only (no Neon driver). Works for local Postgres and Neon (SSL).
import * as schema from "../shared/schema";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

const url =
  (typeof process !== "undefined" && process.env && process.env.DATABASE_URL) ||
  "postgres://forescore:forescore@localhost:5432/forescore";

const isNeon = /neon\.tech/i.test(url) || /sslmode=require/i.test(url);

const pool = new Pool({
  connectionString: url,
  ssl: isNeon ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool, { schema });
