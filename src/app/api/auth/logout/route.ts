import { NextRequest, NextResponse } from "next/server";
import { revokeToken, auditEvent, getAuthUser } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    await revokeToken(authHeader.slice(7));
  }
  if (user) await auditEvent(user.id, "logout", req);
  return NextResponse.json({ ok: true });
}
