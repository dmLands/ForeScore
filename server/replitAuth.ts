// server/replitAuth.ts — adds verifyRoomToken and works without Replit env
import type { Express, RequestHandler } from "express";
import session from "express-session";
import passport from "passport";
import crypto from "node:crypto";

const SESSION_SECRET = process.env.SESSION_SECRET || "devsecret";

export async function setupAuth(app: Express) {
  const store = new session.MemoryStore();
  app.use(
    session({
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true, sameSite: "lax", maxAge: 7 * 24 * 60 * 60 * 1000 },
      store,
    })
  );

  passport.serializeUser((user: any, done) => done(null, user));
  passport.deserializeUser((obj: any, done) => done(null, obj));

  app.use(passport.initialize());
  app.use(passport.session());
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if ((req as any).isAuthenticated?.()) return next();
  if ((req as any).user) return next();
  return res.status(401).json({ message: "Not authenticated" });
};

type RoomClaims = { userId: string; roomId: string; iat: number };

function b64url(input: Buffer | string) {
  const b = Buffer.isBuffer(input) ? input : Buffer.from(String(input));
  return b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function b64urlDecode(s: string) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4 ? 4 - (s.length % 4) : 0;
  return Buffer.from(s + "=".repeat(pad), "base64").toString("utf8");
}

export function generateRoomToken(userId: string, roomId: string, maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
  const claims: RoomClaims = { userId, roomId, iat: Date.now() };
  const payload = b64url(JSON.stringify(claims));
  const sig = b64url(crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest());
  return `${payload}.${sig}`;
}

/** Matches: import { verifyRoomToken } from './replitAuth.js' */
export function verifyRoomToken(
  token: string,
  expectedRoomId?: string,
  expectedUserId?: string,
  maxAgeMs = 7 * 24 * 60 * 60 * 1000
): boolean {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [payloadB64, sig] = parts;
  const expectedSig = b64url(
    crypto.createHmac("sha256", SESSION_SECRET).update(payloadB64).digest()
  );
  if (sig !== expectedSig) return false;

  let claims: RoomClaims;
  try {
    claims = JSON.parse(b64urlDecode(payloadB64));
  } catch {
    return false;
  }

  if (!claims.userId || !claims.roomId || !claims.iat) return false;
  const age = Date.now() - claims.iat;
  if (age < 0 || age > maxAgeMs) return false;
  if (expectedRoomId && claims.roomId !== expectedRoomId) return false;
  if (expectedUserId && claims.userId !== expectedUserId) return false;
  return true;
}
