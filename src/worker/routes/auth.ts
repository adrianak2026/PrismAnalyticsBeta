import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { AppEnv } from "../env";
import { database, users } from "../db/queries";
import { createToken, hashPassword, requireAuth, verifyPassword } from "../utils/auth";


const credentials = z.object({
  email: z.string().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
  name: z.string().trim().min(2).max(80).optional(),
});

const auth = new Hono<AppEnv>();

auth.post("/auth/signup", async (c) => {
  const input = credentials.safeParse(await c.req.json().catch(() => null));
  if (!input.success) return c.json({ error: "Use a valid email and password of at least 8 characters" }, 400);
  const db = database(c.env.DB);
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, input.data.email)).limit(1);
  if (existing.length) return c.json({ error: "An account with this email already exists" }, 409);

  const user = { id: crypto.randomUUID(), email: input.data.email, name: input.data.name || null };
  await db.insert(users).values({ ...user, passwordHash: await hashPassword(input.data.password), createdAt: Math.floor(Date.now() / 1000) });
  return c.json({ user, token: await createToken(user, c.env.JWT_SECRET) }, 201);
});

auth.post("/auth/login", async (c) => {
  const input = credentials.omit({ name: true }).safeParse(await c.req.json().catch(() => null));
  if (!input.success) return c.json({ error: "Invalid credentials" }, 400);
  const rows = await database(c.env.DB).select().from(users).where(eq(users.email, input.data.email)).limit(1);
  const row = rows[0];
  if (!row || !(await verifyPassword(input.data.password, row.passwordHash))) return c.json({ error: "Invalid email or password" }, 401);
  const user = { id: row.id, email: row.email, name: row.name };
  return c.json({ user, token: await createToken(user, c.env.JWT_SECRET) });
});

auth.get("/auth/me", requireAuth, (c) => c.json({ user: c.get("user") }));

auth.delete("/auth/account", requireAuth, async (c) => {
  const user = c.get("user");
  await database(c.env.DB).delete(users).where(eq(users.id, user.id));
  return c.json({ deleted: true });
});

export default auth;
