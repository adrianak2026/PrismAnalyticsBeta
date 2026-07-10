import { db } from "@/db";
import { users, sessions, auditLog, rateLimits } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { verifyJWT, sha256, generateToken, getClientIP } from "./security";
import { NextRequest, NextResponse } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "prism-dev-secret-change-in-production-min-32-chars";

export interface AuthedUser {
  id: string;
  email: string;
  name: string | null;
}

export async function getAuthUser(req: NextRequest): Promise<AuthedUser | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const payload = await verifyJWT(token, JWT_SECRET);
  if (!payload) return null;

  // Verify session is not revoked
  const tokenHash = sha256(token);
  const now = Date.now();
  const [session] = await db.select().from(sessions).where(
    and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now))
  ).limit(1);
  if (!session || session.revokedAt) return null;

  return payload;
}

export function requireAuth(handler: (req: NextRequest, user: AuthedUser, ctx?: unknown) => Promise<NextResponse>) {
  return async (req: NextRequest, ctx?: unknown) => {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return handler(req, user, ctx);
  };
}

export { JWT_SECRET };

export async function createSession(userId: string, token: string, userAgent: string | null): Promise<string> {
  const id = generateToken(16);
  const tokenHash = sha256(token);
  const uaHash = userAgent ? sha256(userAgent) : null;
  await db.insert(sessions).values({
    id,
    userId,
    tokenHash,
    userAgentHash: uaHash,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });
  return id;
}

export async function revokeToken(token: string): Promise<void> {
  const tokenHash = sha256(token);
  await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.tokenHash, tokenHash));
}

export async function auditEvent(userId: string | null, action: string, req: NextRequest, metadata?: Record<string, unknown>) {
  const ip = getClientIP(req.headers);
  const dailySalt = new Date().toISOString().slice(0, 10);
  await db.insert(auditLog).values({
    id: generateToken(16),
    userId,
    action,
    metadata: metadata as unknown,
    ipHash: sha256(`${ip}|${dailySalt}`),
  });
}

/**
 * Database-backed rate limiter (works across Next.js edge/serverless).
 * Falls back to memory limiter on DB errors.
 */
export async function rateLimit(key: string, max: number, windowMs: number): Promise<{ allowed: boolean; retryIn: number }> {
  try {
    const now = Date.now();
    const [existing] = await db.select().from(rateLimits).where(eq(rateLimits.key, key)).limit(1);
    if (!existing || now - existing.windowStart > windowMs) {
      await db.insert(rateLimits).values({ key, count: 1, windowStart: now })
        .onConflictDoUpdate({ target: rateLimits.key, set: { count: 1, windowStart: now } });
      return { allowed: true, retryIn: 0 };
    }
    if (existing.count >= max) {
      return { allowed: false, retryIn: windowMs - (now - existing.windowStart) };
    }
    await db.update(rateLimits).set({ count: existing.count + 1 }).where(eq(rateLimits.key, key));
    return { allowed: true, retryIn: 0 };
  } catch {
    return { allowed: true, retryIn: 0 };
  }
}

export async function isLockedOut(userId: string): Promise<boolean> {
  const [user] = await db.select({ lockedUntil: users.lockedUntil }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user?.lockedUntil) return false;
  return user.lockedUntil > Date.now();
}

export async function recordFailedLogin(email: string): Promise<void> {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) return;
  const attempts = user.failedLoginAttempts + 1;
  const update: { failedLoginAttempts: number; lockedUntil?: number } = { failedLoginAttempts: attempts };
  if (attempts >= 5) {
    update.lockedUntil = Date.now() + 15 * 60 * 1000;
  }
  await db.update(users).set(update).where(eq(users.id, user.id));
}

export async function resetFailedLogins(userId: string): Promise<void> {
  await db.update(users).set({
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: new Date(),
  }).where(eq(users.id, userId));
}

export function securityHeaders(): Record<string, string> {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  };
}
