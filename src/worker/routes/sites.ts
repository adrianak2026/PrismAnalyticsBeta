import { Hono } from "hono";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import type { AppEnv } from "../env";
import { database, sites } from "../db/queries";
import { requireAuth } from "../utils/auth";

const siteInput = z.object({
  name: z.string().trim().min(2).max(80),
  domain: z.string().trim().max(255).optional(),
});

const siteUpdateInput = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  domain: z.string().trim().max(255).optional(),
  ipPrivacyMode: z.enum(["strict_hash", "store_raw"]).optional(),
});

function normalizeDomain(value?: string) {
  if (!value) return null;
  return value.replace(/^https?:\/\//i, "").replace(/\/$/, "").toLowerCase();
}

const siteRoutes = new Hono<AppEnv>();
siteRoutes.use("/sites/*", requireAuth);
siteRoutes.use("/sites", requireAuth);

siteRoutes.get("/sites", async (c) => {
  const user = c.get("user");
  const rows = await database(c.env.DB).select({
    id: sites.id,
    name: sites.name,
    domain: sites.domain,
    trackingCode: sites.trackingCode,
    ipPrivacyMode: sites.ipPrivacyMode,
    createdAt: sites.createdAt,
  }).from(sites).where(eq(sites.userId, user.id)).orderBy(desc(sites.createdAt));
  return c.json({ sites: rows });
});

siteRoutes.post("/sites", async (c) => {
  const input = siteInput.safeParse(await c.req.json().catch(() => null));
  if (!input.success) return c.json({ error: "A site name is required" }, 400);
  const user = c.get("user");
  const row = {
    id: crypto.randomUUID(),
    userId: user.id,
    name: input.data.name,
    domain: normalizeDomain(input.data.domain),
    trackingCode: `pa_${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`,
    ipPrivacyMode: "strict_hash" as const,
    createdAt: Math.floor(Date.now() / 1000),
  };
  await database(c.env.DB).insert(sites).values(row);
  return c.json({ site: row }, 201);
});

siteRoutes.delete("/sites/:id", async (c) => {
  const user = c.get("user");
  const siteId = c.req.param("id");
  const owned = await database(c.env.DB).select({ id: sites.id }).from(sites).where(and(eq(sites.id, siteId), eq(sites.userId, user.id))).limit(1);
  if (!owned.length) return c.json({ error: "Site not found" }, 404);
  await database(c.env.DB).delete(sites).where(and(eq(sites.id, siteId), eq(sites.userId, user.id)));
  return c.json({ deleted: true });
});

siteRoutes.put("/sites/:id", async (c) => {
  const user = c.get("user");
  const siteId = c.req.param("id");
  const input = siteUpdateInput.safeParse(await c.req.json().catch(() => null));
  if (!input.success) return c.json({ error: "Invalid data" }, 400);

  const owned = await database(c.env.DB).select().from(sites).where(and(eq(sites.id, siteId), eq(sites.userId, user.id))).limit(1);
  if (!owned.length) return c.json({ error: "Site not found" }, 404);

  const updates: Partial<typeof sites.$inferInsert> = {};
  if (input.data.name !== undefined) updates.name = input.data.name;
  if (input.data.domain !== undefined) updates.domain = normalizeDomain(input.data.domain) || null;
  if (input.data.ipPrivacyMode !== undefined) updates.ipPrivacyMode = input.data.ipPrivacyMode;

  if (Object.keys(updates).length > 0) {
    await database(c.env.DB).update(sites).set(updates).where(and(eq(sites.id, siteId), eq(sites.userId, user.id)));
  }
  
  const [updatedSite] = await database(c.env.DB).select().from(sites).where(eq(sites.id, siteId)).limit(1);
  return c.json({ site: updatedSite });
});

export default siteRoutes;
