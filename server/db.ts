import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure neon for WebSocket support
neonConfig.webSocketConstructor = ws;
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineConnect = false;
neonConfig.pipelineTLS = false;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Fewer connections + shorter idle timeout so stale connections are closed
// before Neon's compute endpoint kills them (avoids 57P01 mid-request)
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 2,
  idleTimeoutMillis: 20000,
  connectionTimeoutMillis: 10000,
  maxUses: 100,
  allowExitOnIdle: false
});

// Destroy the bad client rather than returning it to the pool
pool.on('error', (err, client) => {
  console.error('Database pool error:', err.message || err);
  try {
    (client as any).release(true);
  } catch (_) {}
});

export const db = drizzle({ client: pool, schema });

// Error codes that indicate a terminated/reset connection
const RETRYABLE_CODES = new Set(['57P01', 'ECONNRESET', 'CONNECTION_ENDED', '08006', '08001', '08004']);

/**
 * Wraps a database operation with one automatic retry on connection errors.
 * Neon serverless can terminate connections when compute restarts (57P01).
 * On those errors we wait briefly and retry once before propagating.
 */
export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    const code = err?.code || err?.cause?.code;
    if (RETRYABLE_CODES.has(code)) {
      console.warn(`DB connection error (${code}), retrying once...`);
      await new Promise(res => setTimeout(res, 300));
      return await fn();
    }
    throw err;
  }
}

// Test the connection on startup
async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('Database connection established successfully');
    client.release();
  } catch (error) {
    console.error('Failed to connect to database:', error);
  }
}

testConnection();
