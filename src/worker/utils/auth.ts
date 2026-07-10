import type { Context, MiddlewareHandler } from "hono";
import { SignJWT, jwtVerify } from "jose";
import type { AuthUser } from "@/shared/types";
import type { AppEnv, WorkerBindings } from "../env";
import { getOrCreateD1Secret } from "../db/bootstrap";

const encoder = new TextEncoder();
const ITERATIONS = 100_000;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS },
    key,
    256,
  );
  return `${ITERATIONS}.${bytesToBase64(salt)}.${bytesToBase64(new Uint8Array(bits))}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [iterationsValue, saltValue, expectedValue] = stored.split(".");
  if (!iterationsValue || !saltValue || !expectedValue) return false;
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const actual = new Uint8Array(await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: base64ToBytes(saltValue), iterations: Number(iterationsValue) },
    key,
    256,
  ));
  const expected = base64ToBytes(expectedValue);
  if (actual.length !== expected.length) return false;
  let mismatch = 0;
  for (let index = 0; index < actual.length; index += 1) mismatch |= actual[index] ^ expected[index];
  return mismatch === 0;
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function resolveJwtSecret(env: WorkerBindings): Promise<string> {
  if (env.JWT_SECRET && env.JWT_SECRET.length >= 32) return env.JWT_SECRET;
  return getOrCreateD1Secret(env.DB, "jwt_signing_key_v1");
}

export async function createToken(user: AuthUser, secret: string): Promise<string> {
  return new SignJWT({ email: user.email, name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuer("prism-analytics")
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encoder.encode(secret));
}

export async function registerSession(env: WorkerBindings, userId: string, token: string, userAgent: string | null) {
  await env.DB.prepare(`
    INSERT INTO sessions (id, user_id, token_hash, user_agent_hash, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(
    crypto.randomUUID(),
    userId,
    await sha256(token),
    userAgent ? await sha256(userAgent) : null,
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).run();
}

export async function revokeSession(env: WorkerBindings, token: string) {
  await env.DB.prepare("UPDATE sessions SET revoked_at = ? WHERE token_hash = ?")
    .bind(Date.now(), await sha256(token))
    .run();
}

export async function verifyAuth(c: Context<AppEnv>): Promise<AuthUser | null> {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7);
  try {
    const key = await resolveJwtSecret(c.env);
    const { payload } = await jwtVerify(token, encoder.encode(key), { algorithms: ["HS256"], issuer: "prism-analytics" });
    if (!payload.sub || typeof payload.email !== "string") return null;
    const session = await c.env.DB.prepare(`
      SELECT id FROM sessions
      WHERE token_hash = ? AND expires_at > ? AND revoked_at IS NULL
      LIMIT 1
    `).bind(await sha256(token), Date.now()).first();
    if (!session) return null;
    return { id: payload.sub, email: payload.email, name: typeof payload.name === "string" ? payload.name : null };
  } catch {
    return null;
  }
}

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const user = await verifyAuth(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  c.set("user", user);
  await next();
};
