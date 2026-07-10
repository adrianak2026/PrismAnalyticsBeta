import type { R2Bucket } from "@cloudflare/workers-types";

export async function archiveExport(bucket: R2Bucket, userId: string, siteId: string, payload: unknown) {
  const key = `exports/${userId}/${siteId}/${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  await bucket.put(key, JSON.stringify(payload), {
    httpMetadata: { contentType: "application/json" },
    customMetadata: { siteId, userId, privacy: "anonymized-only" },
  });
  return key;
}

export async function removeTenantArchive(bucket: R2Bucket, userId: string) {
  let cursor: string | undefined;
  do {
    const result = await bucket.list({ prefix: `exports/${userId}/`, cursor });
    if (result.objects.length) await bucket.delete(result.objects.map((object) => object.key));
    cursor = result.truncated ? result.cursor : undefined;
  } while (cursor);
}
