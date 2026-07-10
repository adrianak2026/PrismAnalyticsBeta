import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, auditEvent, securityHeaders } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const DELETE = requireAuth(async (req: NextRequest, user) => {
  await auditEvent(user.id, "account_deleted", req);
  await db.delete(users).where(eq(users.id, user.id));
  return NextResponse.json({ deleted: true }, { headers: securityHeaders() });
});
