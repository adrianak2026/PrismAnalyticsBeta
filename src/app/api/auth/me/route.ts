import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = requireAuth(async (_req, user) => {
  return NextResponse.json({ user });
});
