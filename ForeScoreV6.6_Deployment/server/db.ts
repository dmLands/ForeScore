import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure neon for WebSocket support
neonConfig.webSocketConstructor = ws;
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineConnect = false;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create connection pool with better error handling and retry logic
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 3,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  maxUses: 100,
  allowExitOnIdle: false
});

// Add error handler for the pool
pool.on('error', (err) => {
  console.error('Database pool error:', err);
  // Don't exit the process, let it retry
});

export const db = drizzle({ client: pool, schema });

// Test the connection on startup
async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('Database connection established successfully');
    client.release();
  } catch (error) {
    console.error('Failed to connect to database:', error);
    // Don't throw, let the app start and retry later
  }
}

testConnection();