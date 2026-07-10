import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { AppEnv } from "../env";
import { database, users } from "../db/queries";
import {
  createToken,
  hashPassword,
  registerSession,
  requireAuth,
  resolveJwtSecret,
  revokeSession,
  verifyPassword,
} from "../utils/auth";
import { checkMx, d1RateLimit, isDisposableEmail, passwordIsStrong, sha256 } from "../utils/security";

const credentials = z.object({
  email: z.string().email().max(254).transform((value) => value.trim().toLowerCase()),
  password: z.string().min(8).max(128),
  name: z.string().trim().min(2).max(80).optional(),
});

const auth = new Hono<AppEnv>();

function requestIp(c: { req: { header(name: string): string | undefined } }) {
  return c.req.header("CF-Connecting-IP") || c.req.header("X-Real-IP") || "unknown";
}

async function audit(c: Parameters<typeof requestIp>[0] & { env: AppEnv["Bindings"] }, userId: string | null, action: string, metadata?: unknown) {
  const day = new Date().toISOString().slice(0, 10);
  await c.env.DB.prepare(`
    INSERT INTO audit_log (id, user_id, action, metadata, ip_hash)
    VALUES (?, ?, ?, ?, ?)
  `).bind(
    crypto.randomUUID(),
    userId,
    action,
    metadata ? JSON.stringify(metadata) : null,
    await sha256(`${requestIp(c)}|${day}`),
  ).run();
}

async function issueSession(c: Parameters<typeof requestIp>[0] & { env: AppEnv["Bindings"] }, user: { id: string; email: string; name: string | null }) {
  const token = await createToken(user, await resolveJwtSecret(c.env));
  await registerSession(c.env, user.id, token, c.req.header("User-Agent") || null);
  return token;
}

auth.post("/auth/check-email", async (c) => {
  const body: { email?: string } = await c.req.json<{ email?: string }>().catch(() => ({}));
  const email = body.email?.trim().toLowerCase() || "";
  if (!z.string().email().safeParse(email).success) return c.json({ valid: false, message: "Invalid email format" });

  const limiter = await d1RateLimit(c.env.DB, `email:${await sha256(requestIp(c))}`, 30, 60_000);
  if (!limiter.allowed) return c.json({ valid: false, message: "Too many checks. Try again shortly." }, 429);
  if (isDisposableEmail(email)) return c.json({ valid: false, disposable: true, message: "Disposable email is not allowed" });

  const result = await checkMx(email);
  return c.json(result);
});

auth.post("/auth/signup", async (c) => {
  const limiter = await d1RateLimit(c.env.DB, `signup:${await sha256(requestIp(c))}`, 5, 60 * 60_000);
  if (!limiter.allowed) return c.json({ error: "Too many signup attempts. Try again later." }, 429);

  const input = credentials.safeParse(await c.req.json().catch(() => null));
  if (!input.success) return c.json({ error: "Use a valid email and password of at least 8 characters" }, 400);
  if (isDisposableEmail(input.data.email)) return c.json({ error: "Disposable email addresses are not allowed." }, 400);
  if (!passwordIsStrong(input.data.password)) return c.json({ error: "Password is too weak. Use uppercase, lowercase, number, and a symbol." }, 400);

  const mx = await checkMx(input.data.email);
  if (!mx.valid) return c.json({ error: mx.message || "Email domain cannot receive mail." }, 400);

  const db = database(c.env.DB);
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, input.data.email)).limit(1);
  if (existing.length) return c.json({ error: "An account with this email already exists" }, 409);

  const user = { id: crypto.randomUUID(), email: input.data.email, name: input.data.name || null };
  await db.insert(users).values({
    ...user,
    passwordHash: await hashPassword(input.data.password),
    createdAt: Math.floor(Date.now() / 1000),
  });
  const token = await issueSession(c, user);
  await audit(c, user.id, "signup", { mxRecords: mx.records });
  return c.json({ user, token }, 201);
});

auth.post("/auth/login", async (c) => {
  const limiter = await d1RateLimit(c.env.DB, `login:${await sha256(requestIp(c))}`, 10, 15 * 60_000);
  if (!limiter.allowed) return c.json({ error: "Too many login attempts. Try again later." }, 429);

  const input = credentials.omit({ name: true }).safeParse(await c.req.json().catch(() => null));
  if (!input.success) return c.json({ error: "Invalid credentials" }, 400);

  const db = database(c.env.DB);
  const rows = await db.select().from(users).where(eq(users.email, input.data.email)).limit(1);
  const row = rows[0];
  if (!row) return c.json({ error: "Invalid email or password" }, 401);

  const lock = await c.env.DB.prepare("SELECT failed_login_attempts, locked_until FROM users WHERE id = ?")
    .bind(row.id)
    .first<{ failed_login_attempts: number; locked_until: number | null }>();
  if (lock?.locked_until && lock.locked_until > Date.now()) return c.json({ error: "Account temporarily locked. Try again in 15 minutes." }, 423);

  if (!(await verifyPassword(input.data.password, row.passwordHash))) {
    const attempts = (lock?.failed_login_attempts || 0) + 1;
    await c.env.DB.prepare("UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?")
      .bind(attempts, attempts >= 5 ? Date.now() + 15 * 60_000 : null, row.id)
      .run();
    await audit(c, row.id, "login_failed");
    return c.json({ error: "Invalid email or password" }, 401);
  }

  await c.env.DB.prepare("UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = ? WHERE id = ?")
    .bind(Math.floor(Date.now() / 1000), row.id)
    .run();
  const user = { id: row.id, email: row.email, name: row.name };
  const token = await issueSession(c, user);
  await audit(c, row.id, "login_success");
  return c.json({ user, token });
});

auth.get("/auth/me", requireAuth, (c) => c.json({ user: c.get("user") }));

auth.post("/auth/logout", requireAuth, async (c) => {
  const header = c.req.header("Authorization");
  if (header?.startsWith("Bearer ")) await revokeSession(c.env, header.slice(7));
  return c.json({ ok: true });
});

auth.delete("/auth/account", requireAuth, async (c) => {
  const user = c.get("user");
  await database(c.env.DB).delete(users).where(eq(users.id, user.id));
  return c.json({ deleted: true });
});

auth.delete("/account", requireAuth, async (c) => {
  const user = c.get("user");
  await database(c.env.DB).delete(users).where(eq(users.id, user.id));
  return c.json({ deleted: true });
});

export default auth;
