import { db } from "@/db";
import { ensureDatabaseSchema } from "@/db/bootstrap";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureDatabaseSchema();
    await db.execute(sql`select 1`);
    return Response.json({
      ok: true,
      database: "ready",
      storage: "database-only free tier",
      version: "1.0.0",
    });
  } catch (error) {
    console.error("Health check failed", error);
    return Response.json({ ok: false, database: "unavailable" }, { status: 500 });
  }
}
