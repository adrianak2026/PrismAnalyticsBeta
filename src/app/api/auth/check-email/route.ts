import { NextRequest, NextResponse } from "next/server";
import { checkMXRecords, isDisposableEmail, isValidEmailFormat, sha256, getClientIP } from "@/lib/security";
import { rateLimit, securityHeaders } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const headers = securityHeaders();
  const ip = getClientIP(req.headers);
  const rl = await rateLimit(`emailcheck:${sha256(ip)}`, 30, 60 * 1000);
  if (!rl.allowed) return NextResponse.json({ valid: false, message: "Rate limit exceeded" }, { status: 429, headers });

  const body = await req.json().catch(() => null) as { email?: string };
  const email = body?.email?.trim().toLowerCase();
  if (!email) return NextResponse.json({ valid: false, message: "Email required" }, { status: 400, headers });

  if (!isValidEmailFormat(email)) {
    return NextResponse.json({ valid: false, message: "Invalid email format" }, { headers });
  }
  if (isDisposableEmail(email)) {
    return NextResponse.json({ valid: false, message: "Disposable email not allowed", disposable: true }, { headers });
  }
  const mx = await checkMXRecords(email);
  return NextResponse.json({ valid: mx.valid, message: mx.message, records: mx.records.length }, { headers });
}
