import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sites } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { generateToken } from "@/lib/security";
import { requireAuth, auditEvent, securityHeaders } from "@/lib/auth-helpers";
import { containsMaliciousPattern } from "@/lib/bot-detection";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const createSchema = z.object({
  name: z.string().trim().min(2).max(80),
  domain: z.string().trim().max(255).optional(),
});

function normalizeDomain(value?: string): string | null {
  if (!value) return null;
  return value.replace(/^https?:\/\//i, "").replace(/\/$/, "").toLowerCase().trim();
}

export const GET = requireAuth(async (_req, user) => {
  const rows = await db.select({
    id: sites.id,
    name: sites.name,
    domain: sites.domain,
    trackingCode: sites.trackingCode,
    ipPrivacyMode: sites.ipPrivacyMode,
    createdAt: sites.createdAt,
  }).from(sites).where(eq(sites.userId, user.id)).orderBy(desc(sites.createdAt));
  return NextResponse.json({ sites: rows }, { headers: securityHeaders() });
});

export const POST = requireAuth(async (req, user) => {
  const headers = securityHeaders();
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "A site name is required (2-80 characters)." }, { status: 400, headers });

  if (containsMaliciousPattern(parsed.data.name) || (parsed.data.domain && containsMaliciousPattern(parsed.data.domain))) {
    return NextResponse.json({ error: "Invalid input detected." }, { status: 400, headers });
  }

  const row = {
    id: generateToken(16),
    userId: user.id,
    name: parsed.data.name,
    domain: normalizeDomain(parsed.data.domain),
    trackingCode: `pa_${generateToken(10)}`,
    ipPrivacyMode: "strict_hash" as const,
  };
  await db.insert(sites).values(row);
  await auditEvent(user.id, "site_created", req, { siteId: row.id, name: row.name });

  return NextResponse.json({ site: row }, { status: 201, headers });
});
