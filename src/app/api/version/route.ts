import { NextResponse } from "next/server";
import { getVersionInfo, CHANGELOG } from "@/lib/version";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ...getVersionInfo(),
    changelog: CHANGELOG.slice(0, 5),
    uptime: process.uptime(),
    env: {
      node: process.version,
      platform: process.platform,
    },
  });
}
