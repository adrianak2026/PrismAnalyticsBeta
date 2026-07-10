import type { D1Database } from "@cloudflare/workers-types";

const encoder = new TextEncoder();

const DISPOSABLE = new Set([
  "tempmail.com", "10minutemail.com", "guerrillamail.com", "mailinator.com",
  "throwaway.email", "temp-mail.org", "yopmail.com", "sharklasers.com",
  "trashmail.com", "getnada.com", "maildrop.cc", "mintemail.com",
  "mytemp.email", "fakeinbox.com", "spamgourmet.com", "tempinbox.com",
  "dispostable.com", "mailnesia.com", "throwawaymail.com", "tempr.email",
]);

const TRUSTED = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.uk", "yahoo.in",
  "outlook.com", "hotmail.com", "live.com", "icloud.com", "proton.me",
  "protonmail.com", "zoho.com", "fastmail.com", "mail.com",
]);

export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function isDisposableEmail(email: string): boolean {
  const domain = (email.split("@")[1] || "").toLowerCase();
  return DISPOSABLE.has(domain) || /^(temp|throw|trash|junk|fake|spam|burner|10min|guerrilla)/.test(domain);
}

export function passwordIsStrong(password: string): boolean {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  if (/(password|12345678|qwerty|letmein|welcome)/i.test(password)) score = Math.min(score, 1);
  return score >= 3;
}

export async function checkMx(email: string): Promise<{ valid: boolean; message?: string; records: number }> {
  const domain = (email.split("@")[1] || "").toLowerCase();
  if (!domain) return { valid: false, message: "Invalid email format", records: 0 };
  if (TRUSTED.has(domain)) return { valid: true, message: "Trusted email provider", records: 1 };
  try {
    const response = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=MX`, {
      headers: { Accept: "application/dns-json" },
    });
    if (!response.ok) return { valid: true, message: "DNS temporarily unavailable; allowed", records: 0 };
    const data = await response.json() as { Answer?: Array<{ type: number }> };
    const count = (data.Answer || []).filter((answer) => answer.type === 15).length;
    return count > 0
      ? { valid: true, records: count }
      : { valid: false, message: `No MX records found for ${domain}`, records: 0 };
  } catch {
    return { valid: true, message: "DNS timeout; allowed", records: 0 };
  }
}

export async function d1RateLimit(db: D1Database, key: string, max: number, windowMs: number) {
  const now = Date.now();
  const existing = await db.prepare("SELECT count, window_start FROM rate_limits WHERE key = ? LIMIT 1")
    .bind(key)
    .first<{ count: number; window_start: number }>();

  if (!existing || now - existing.window_start > windowMs) {
    await db.prepare(`
      INSERT INTO rate_limits (key, count, window_start) VALUES (?, 1, ?)
      ON CONFLICT(key) DO UPDATE SET count = 1, window_start = excluded.window_start
    `).bind(key, now).run();
    return { allowed: true, retryIn: 0 };
  }
  if (existing.count >= max) return { allowed: false, retryIn: windowMs - (now - existing.window_start) };
  await db.prepare("UPDATE rate_limits SET count = count + 1 WHERE key = ?").bind(key).run();
  return { allowed: true, retryIn: 0 };
}
