// server/replitAuth.ts (local-first shim; safe outside Replit)
import type { Express, RequestHandler } from "express";
import session from "express-session";
import passport from "passport";
import { createHmac } from "node:crypto";

const SESSION_SECRET = process.env.SESSION_SECRET || "devsecret";

/**
 * Sets up session + Passport so `req.login(...)` in your login route works.
 * If Replit OIDC env is present, you can extend this to configure OIDC,
 * but by default this is a local/session auth that works everywhere.
 */
export async function setupAuth(app: Express) {
  // In-memory session store for dev. Swap to connect-pg-simple in prod if desired.
  const store = new session.MemoryStore();
  app.use(
    session({
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
      store,
    }),
  );

  passport.serializeUser((user: any, done) => done(null, user));
  passport.deserializeUser((obj: any, done) => done(null, obj));

  app.use(passport.initialize());
  app.use(passport.session());

  // Optional: if you later want Replit OIDC here, detect env and wire it.
  // For now we keep it local/session-only to avoid REPLIT_* env hard requirements.
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  // Works with passport session OR manual user assignment from your login route
  if ((req as any).isAuthenticated?.()) return next();
  if ((req as any).user?.claims?.sub || (req as any).user?.id) return next();
  return res.status(401).json({ message: "Not authenticated" });
};

export function generateRoomToken(userId: string, roomId: string) {
  // HMAC token; stateless and tied to user + room
  return createHmac("sha256", SESSION_SECRET)
    .update(`${userId}:${roomId}:${Date.now()}`)
    .digest("base64url");
}
