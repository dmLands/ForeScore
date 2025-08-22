// server/db.ts — dotenv-free: uses env if present, otherwise local fallback; Neon or local pg
import * as schema from "@shared/schema";

const url =
  (typeof process !== "undefined" && process.env && process.env.DATABASE_URL) ||
  "postgres://forescore:forescore@localhost:5432/forescore";

function isNeon(u: string): boolean {
  return /neon\.tech/i.test(u) || /sslmode=require/i.test(u) || /NEON/i.test(u);
}

export const db = await (async () => {
  if (isNeon(url)) {
    const { Pool, neonConfig } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-serverless");
    const ws = (await import("ws")).default as any;
    neonConfig.webSocketConstructor = ws;
    neonConfig.useSecureWebSocket = true;
    neonConfig.pipelineConnect = false;

    const pool = new Pool({ connectionString: url });
    try { const c = await pool.connect(); c.release(); console.log("✅ Neon DB connected"); }
    catch (e) { console.warn("⚠️ Neon connect failed (continuing):", e); }
    return drizzle({ client: pool, schema });
  } else {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const pool = new Pool({ connectionString: url });
    try { const c = await pool.connect(); c.release(); console.log("✅ Local Postgres connected"); }
    catch (e) { console.warn("⚠️ Local Postgres connect failed (continuing):", e); }
    return drizzle(pool, { schema });
  }
})();
