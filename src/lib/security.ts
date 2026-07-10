import { createHash, randomBytes, timingSafeEqual, pbkdf2Sync } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";

const encoder = new TextEncoder();
const ITERATIONS = 210_000;
const KEY_LEN = 32;

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = pbkdf2Sync(password, salt, ITERATIONS, KEY_LEN, "sha256");
  return `${ITERATIONS}.${salt.toString("base64")}.${derived.toString("base64")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [iters, saltB64, expectedB64] = stored.split(".");
  if (!iters || !saltB64 || !expectedB64) return false;
  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(expectedB64, "base64");
  const actual = pbkdf2Sync(password, salt, Number(iters), expected.length, "sha256");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export async function createJWT(payload: { sub: string; email: string; name: string | null }, secret: string): Promise<string> {
  return new SignJWT({ email: payload.email, name: payload.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .setIssuer("prism-analytics")
    .sign(encoder.encode(secret));
}

export async function verifyJWT(token: string, secret: string) {
  try {
    const { payload } = await jwtVerify(token, encoder.encode(secret), {
      algorithms: ["HS256"],
      issuer: "prism-analytics",
    });
    if (!payload.sub || typeof payload.email !== "string") return null;
    return {
      id: payload.sub,
      email: payload.email,
      name: typeof payload.name === "string" ? payload.name : null,
    };
  } catch {
    return null;
  }
}

// Disposable / spam email domains
const DISPOSABLE_DOMAINS = new Set([
  "tempmail.com", "10minutemail.com", "guerrillamail.com", "mailinator.com",
  "throwaway.email", "temp-mail.org", "yopmail.com", "sharklasers.com",
  "trashmail.com", "getnada.com", "maildrop.cc", "mintemail.com",
  "mytemp.email", "fakeinbox.com", "spamgourmet.com", "tempinbox.com",
  "dispostable.com", "mailnesia.com", "throwawaymail.com", "tempr.email",
  "temp-mail.io", "temporary-mail.net", "10minutemail.net", "burnermail.io",
]);

const COMMON_PROVIDERS = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.uk", "yahoo.in",
  "outlook.com", "hotmail.com", "live.com", "msn.com", "icloud.com",
  "me.com", "mac.com", "aol.com", "proton.me", "protonmail.com",
  "zoho.com", "yandex.com", "gmx.com", "mail.com", "fastmail.com",
]);

export function isValidEmailFormat(email: string): boolean {
  if (!email || email.length > 254) return false;
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!re.test(email)) return false;
  const [local, domain] = email.split("@");
  if (local.length > 64) return false;
  if (domain.includes("..") || local.includes("..")) return false;
  return true;
}

export function extractDomain(email: string): string {
  return (email.split("@")[1] || "").toLowerCase();
}

export function isDisposableEmail(email: string): boolean {
  const domain = extractDomain(email);
  if (DISPOSABLE_DOMAINS.has(domain)) return true;
  // Common patterns
  if (/^(temp|throw|trash|junk|fake|spam|burner|10min|guerrilla)/.test(domain)) return true;
  return false;
}

export function isCommonProvider(email: string): boolean {
  return COMMON_PROVIDERS.has(extractDomain(email));
}

/**
 * MX record validation via DNS-over-HTTPS (Cloudflare 1.1.1.1).
 * Verifies the email domain can actually receive mail.
 */
export async function checkMXRecords(email: string): Promise<{ valid: boolean; records: string[]; message?: string }> {
  const domain = extractDomain(email);
  if (!domain) return { valid: false, records: [], message: "Invalid email format" };

  // Skip DNS lookup for known providers (they always have MX)
  if (isCommonProvider(email)) {
    return { valid: true, records: ["verified-provider"], message: "Trusted email provider" };
  }

  try {
    const resp = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=MX`, {
      headers: { Accept: "application/dns-json" },
      signal: AbortSignal.timeout(4000),
    });
    if (!resp.ok) return { valid: false, records: [], message: "DNS lookup failed" };
    const data = await resp.json() as { Answer?: Array<{ data: string; type: number }> };
    const mxRecords = (data.Answer || []).filter((r) => r.type === 15).map((r) => r.data);
    if (mxRecords.length === 0) {
      return { valid: false, records: [], message: `No MX records for ${domain}` };
    }
    return { valid: true, records: mxRecords };
  } catch {
    // On DNS failure, allow but flag (fail-open to prevent legit users being blocked)
    return { valid: true, records: [], message: "DNS check timeout — allowed" };
  }
}

export function passwordStrength(password: string): { score: number; issues: string[] } {
  const issues: string[] = [];
  let score = 0;
  if (password.length < 8) issues.push("At least 8 characters");
  else score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  else issues.push("At least one lowercase letter");
  if (/[A-Z]/.test(password)) score++;
  else issues.push("At least one uppercase letter");
  if (/[0-9]/.test(password)) score++;
  else issues.push("At least one number");
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  else issues.push("At least one special character");

  const common = ["password", "12345678", "qwerty", "abc123", "letmein", "welcome"];
  if (common.some((c) => password.toLowerCase().includes(c))) {
    issues.push("Avoid common passwords");
    score = Math.min(score, 1);
  }
  return { score, issues };
}

// Simple in-memory rate limiter fallback (per-instance)
const memBuckets = new Map<string, { count: number; resetAt: number }>();
export function memRateLimit(key: string, maxRequests: number, windowMs: number): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const bucket = memBuckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    memBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetIn: windowMs };
  }
  if (bucket.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetIn: bucket.resetAt - now };
  }
  bucket.count++;
  return { allowed: true, remaining: maxRequests - bucket.count, resetIn: bucket.resetAt - now };
}

export function sanitizeString(input: string, maxLen = 2048): string {
  return input.slice(0, maxLen).replace(/[\x00-\x1F\x7F]/g, "").trim();
}

export function getClientIP(headers: Headers): string {
  return (
    headers.get("cf-connecting-ip") ||
    headers.get("x-real-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export async function dailyUserHash(ip: string, userAgent: string, dailySalt: string): Promise<string> {
  const raw = `${ip}|${userAgent}|${dailySalt}`;
  const buf = await crypto.subtle.digest("SHA-256", encoder.encode(raw));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}
