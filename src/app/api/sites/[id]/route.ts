import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sites } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, auditEvent, securityHeaders } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const updateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  domain: z.string().trim().max(255).optional(),
  ipPrivacyMode: z.enum(["strict_hash", "store_raw"]).optional(),
});

export const DELETE = requireAuth(async (req: NextRequest, user, ctx) => {
  const headers = securityHeaders();
  const params = ((ctx as { params?: Promise<{ id: string }> })?.params);
  const resolved = params ? await params : null;
  const siteId = resolved?.id;
  if (!siteId) return NextResponse.json({ error: "Invalid site id" }, { status: 400, headers });

  const owned = await db.select({ id: sites.id, name: sites.name })
    .from(sites)
    .where(and(eq(sites.id, siteId), eq(sites.userId, user.id)))
    .limit(1);
  if (!owned.length) return NextResponse.json({ error: "Site not found" }, { status: 404, headers });

  await db.delete(sites).where(and(eq(sites.id, siteId), eq(sites.userId, user.id)));
  await auditEvent(user.id, "site_deleted", req, { siteId, name: owned[0].name });

  return NextResponse.json({ deleted: true }, { headers });
});

export const PUT = requireAuth(async (req: NextRequest, user, ctx) => {
  const headers = securityHeaders();
  const params = ((ctx as { params?: Promise<{ id: string }> })?.params);
  const resolved = params ? await params : null;
  const siteId = resolved?.id;
  if (!siteId) return NextResponse.json({ error: "Invalid site id" }, { status: 400, headers });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.format() },
      { status: 400, headers }
    );
  }

  const { name, domain, ipPrivacyMode } = parsed.data;

  // Verify site ownership
  const [existingSite] = await db
    .select()
    .from(sites)
    .where(and(eq(sites.id, siteId), eq(sites.userId, user.id)))
    .limit(1);

  if (!existingSite) {
    return NextResponse.json(
      { error: "Site not found or access denied" },
      { status: 404, headers }
    );
  }

  // Build update object
  const updates: Partial<typeof sites.$inferInsert> = {};
  if (name !== undefined) updates.name = name;
  if (domain !== undefined) updates.domain = domain || null;
  if (ipPrivacyMode !== undefined) updates.ipPrivacyMode = ipPrivacyMode;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No fields to update" },
      { status: 400, headers }
    );
  }

  // Update site
  await db
    .update(sites)
    .set(updates)
    .where(and(eq(sites.id, siteId), eq(sites.userId, user.id)));

  // Fetch updated site
  const [updatedSite] = await db
    .select()
    .from(sites)
    .where(eq(sites.id, siteId))
    .limit(1);

  await auditEvent(user.id, "site_updated", req, {
    siteId,
    changes: updates,
  });

  return NextResponse.json({ site: updatedSite }, { headers });
});
