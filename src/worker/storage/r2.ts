import { AwsClient } from "aws4fetch";
import type { WorkerBindings } from "../env";

function getB2Client(env: WorkerBindings) {
  const accessKeyId = env.B2_APPLICATION_KEY_ID;
  const secretAccessKey = env.B2_APPLICATION_KEY;
  if (!accessKeyId || !secretAccessKey) {
    throw new Error("Missing Backblaze B2 credentials (B2_APPLICATION_KEY_ID or B2_APPLICATION_KEY)");
  }
  
  return new AwsClient({
    accessKeyId,
    secretAccessKey,
    service: "s3",
    region: env.B2_REGION || "us-east-005",
  });
}

export async function archiveExport(env: WorkerBindings, userId: string, siteId: string, payload: unknown) {
  const endpoint = env.B2_ENDPOINT || "https://s3.us-east-005.backblazeb2.com";
  const bucketName = env.B2_BUCKET_NAME || "prism-data-bucket";
  
  const key = `exports/${userId}/${siteId}/${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  const client = getB2Client(env);
  
  const url = `${endpoint.replace(/\/$/, "")}/${bucketName}/${key}`;
  
  const response = await client.fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-amz-meta-siteid": siteId,
      "x-amz-meta-userid": userId,
      "x-amz-meta-privacy": "anonymized-only",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`B2 archive upload failed: ${response.statusText} (${await response.text()})`);
  }

  return key;
}

export async function removeTenantArchive(env: WorkerBindings, userId: string) {
  const endpoint = env.B2_ENDPOINT || "https://s3.us-east-005.backblazeb2.com";
  const bucketName = env.B2_BUCKET_NAME || "prism-data-bucket";
  const prefix = `exports/${userId}/`;
  
  const client = getB2Client(env);
  
  // List keys
  const listUrl = `${endpoint.replace(/\/$/, "")}/${bucketName}?prefix=${encodeURIComponent(prefix)}`;
  const listResponse = await client.fetch(listUrl);
  if (!listResponse.ok) {
    throw new Error(`Failed to list B2 archive files: ${listResponse.statusText}`);
  }
  
  const xmlText = await listResponse.text();
  const keys: string[] = [];
  const keyRegex = /<Key>([^<]+)<\/Key>/g;
  let match;
  while ((match = keyRegex.exec(xmlText)) !== null) {
    keys.push(match[1]);
  }
  
  // Delete each key
  for (const key of keys) {
    const deleteUrl = `${endpoint.replace(/\/$/, "")}/${bucketName}/${encodeURIComponent(key)}`;
    const deleteResponse = await client.fetch(deleteUrl, { method: "DELETE" });
    if (!deleteResponse.ok) {
      console.error(`Failed to delete B2 object ${key}: ${deleteResponse.statusText}`);
    }
  }
}
