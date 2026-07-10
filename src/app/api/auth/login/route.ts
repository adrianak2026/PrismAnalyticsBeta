import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { verifyPassword, createJWT, sha256, getClientIP } from "@/lib/security";
import { rateLimit, createSession, auditEvent, isLockedOut, recordFailedLogin, resetFailedLogins, JWT_SECRET, securityHeaders } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schema = z.object({
  email: z.string().trim().email().max(254).transform((v) => v.toLowerCase()),
  password: z.string().min(1).max(128),
});

export async function POST(req: NextRequest) {
  const headers = securityHeaders();

  const ip = getClientIP(req.headers);
  const rl = await rateLimit(`login:${sha256(ip)}`, 10, 15 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: `Too many attempts. Try again in ${Math.ceil(rl.retryIn / 60000)} minutes.` }, { status: 429, headers });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 400, headers });
  }

  const { email, password } = parsed.data;
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    // Constant-time delay to prevent user enumeration
    await new Promise((r) => setTimeout(r, 300));
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401, headers });
  }

  if (await isLockedOut(user.id)) {
    await auditEvent(user.id, "login_blocked_locked", req);
    return NextResponse.json({ error: "Account temporarily locked. Try again in 15 minutes." }, { status: 423, headers });
  }

  if (!verifyPassword(password, user.passwordHash)) {
    await recordFailedLogin(email);
    await auditEvent(user.id, "login_failed", req);
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401, headers });
  }

  await resetFailedLogins(user.id);
  const token = await createJWT({ sub: user.id, email: user.email, name: user.name }, JWT_SECRET);
  await createSession(user.id, token, req.headers.get("user-agent"));
  await auditEvent(user.id, "login_success", req);

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name },
    token,
  }, { headers });
}
