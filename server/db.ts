// server/db.ts (dual driver: Neon for neon.tech URLs, pg for local Postgres)
import * as schema from "@shared/schema";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

// Use Neon serverless driver for Neon URLs; otherwise use node-postgres
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
    // Optional: test connection
    try {
      const c = await pool.connect();
      c.release();
      console.log("✅ Neon DB connected");
    } catch (e) {
      console.warn("⚠️ Neon connect attempt failed (will continue):", e);
    }
    return drizzle({ client: pool, schema });
  } else {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const pool = new Pool({ connectionString: url });
    // Optional: test connection
    try {
      const c = await pool.connect();
      c.release();
      console.log("✅ Local Postgres connected");
    } catch (e) {
      console.warn("⚠️ Local Postgres connect attempt failed (will continue):", e);
    }
    return drizzle(pool, { schema });
  }
})();
