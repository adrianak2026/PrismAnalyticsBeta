import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { hashPassword, isValidEmailFormat, isDisposableEmail, passwordStrength, checkMXRecords, generateToken, createJWT, sha256, getClientIP } from "@/lib/security";
import { rateLimit, createSession, auditEvent, JWT_SECRET, securityHeaders } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254).transform((v) => v.toLowerCase()),
  password: z.string().min(8).max(128),
});

export async function POST(req: NextRequest) {
  try {
    const headers = securityHeaders();

    const ip = getClientIP(req.headers);
    const rl = await rateLimit(`signup:${sha256(ip)}`, 5, 60 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many signup attempts. Try again later." }, { status: 429, headers });
    }

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Please provide a valid name, email, and password (min 8 characters)." }, { status: 400, headers });
    }

    const { name, email, password } = parsed.data;

    if (!isValidEmailFormat(email)) {
      return NextResponse.json({ error: "Invalid email format." }, { status: 400, headers });
    }

    if (isDisposableEmail(email)) {
      return NextResponse.json({ error: "Disposable email addresses are not allowed." }, { status: 400, headers });
    }

    const strength = passwordStrength(password);
    if (strength.score < 3) {
      return NextResponse.json({ error: `Password too weak. ${strength.issues.join(", ")}.` }, { status: 400, headers });
    }

    // MX record validation
    const mx = await checkMXRecords(email);
    if (!mx.valid) {
      return NextResponse.json({ error: mx.message || "Email domain cannot receive mail." }, { status: 400, headers });
    }

    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing.length) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409, headers });
    }

    const user = {
      id: generateToken(16),
      email,
      name,
      passwordHash: hashPassword(password),
      emailVerified: false,
    };
    await db.insert(users).values(user);

    const token = await createJWT({ sub: user.id, email: user.email, name: user.name }, JWT_SECRET);
    await createSession(user.id, token, req.headers.get("user-agent"));
    await auditEvent(user.id, "signup", req, { email, mxProvider: mx.records[0] || "unknown" });

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
      token,
    }, { status: 201, headers });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[SIGNUP ERROR]", message);
    return NextResponse.json({ error: "Signup failed. Please try again. If the issue persists, ensure the database schema is applied (run: npx drizzle-kit push --force)." }, { status: 500 });
  }
}
