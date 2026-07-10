import type { WorkerBindings } from "../env";
import { getOrCreateD1Secret } from "../db/bootstrap";

const encoder = new TextEncoder();

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function anonymizeUser(
  ip: string | null,
  userAgent: string | null,
  env: WorkerBindings,
): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);
  const saltKey = `salt_${today}`;
  let salt: string | null = null;
  try {
    if (env.KV) {
      salt = await env.KV.get(saltKey);
      if (!salt) {
        salt = crypto.randomUUID();
        await env.KV.put(saltKey, salt, { expirationTtl: 48 * 60 * 60 });
      }
    }
  } catch {
    // Safe fallback if KV is unbound during local testing
  }
  if (!salt) {
    salt = await getOrCreateD1Secret(env.DB, saltKey);
  }

  const raw = `${ip || "unknown"}|${userAgent || "unknown"}|${salt}`;
  return toHex(await crypto.subtle.digest("SHA-256", encoder.encode(raw)));
}

export function isBot(userAgent: string | null): boolean {
  if (!userAgent) return true;
  return /(bot|crawl|spider|headless|slurp|facebookexternalhit|preview|lighthouse)/i.test(userAgent);
}

export function detectDevice(userAgent: string | null): "Mobile" | "Tablet" | "Desktop" | "Unknown" {
  if (!userAgent) return "Unknown";
  if (/ipad|tablet|playbook|silk/i.test(userAgent)) return "Tablet";
  if (/mobile|iphone|ipod|android/i.test(userAgent)) return "Mobile";
  return "Desktop";
}

export function detectBrowser(userAgent: string | null): string {
  if (!userAgent) return "Unknown";
  if (/edg/i.test(userAgent)) return "Edge";
  if (/opr|opera/i.test(userAgent)) return "Opera";
  if (/firefox|fxios/i.test(userAgent)) return "Firefox";
  if (/chrome|crios/i.test(userAgent)) return "Chrome";
  if (/safari/i.test(userAgent)) return "Safari";
  return "Other";
}

export function detectOS(userAgent: string | null): string {
  if (!userAgent) return "Unknown";
  if (/windows/i.test(userAgent)) return "Windows";
  if (/android/i.test(userAgent)) return "Android";
  if (/iphone|ipad|ipod/i.test(userAgent)) return "iOS";
  if (/mac os|macintosh/i.test(userAgent)) return "macOS";
  if (/linux/i.test(userAgent)) return "Linux";
  return "Other";
}
