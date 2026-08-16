import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";

export const UPLOAD_COOKIE = "wedding_upload";
export const UPLOAD_COOKIE_MAX_AGE = 60 * 60 * 36;

function code(): string {
  return process.env.UPLOAD_GUEST_CODE ?? "";
}

function secret(): string {
  return process.env.UPLOAD_SESSION_SECRET ?? "";
}

function jwtSecret(): string {
  return process.env.JWT_SECRET ?? "";
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function isUploadAccessConfigured(): boolean {
  return code().length >= 4 && secret().length >= 32 && jwtSecret().length >= 32;
}

export function createUploadJwt(path: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
    "base64url",
  );
  const payload = Buffer.from(
    JSON.stringify({
      aud: "authenticated",
      role: "authenticated",
      iss: "wedding-upload",
      sub: crypto.randomUUID(),
      upload_path: path,
      iat: now,
      exp: now + 3 * 60 * 60,
    }),
  ).toString("base64url");
  const signature = crypto
    .createHmac("sha256", jwtSecret())
    .update(`${header}.${payload}`)
    .digest("base64url");
  return `${header}.${payload}.${signature}`;
}

export function checkUploadCode(candidate: string): boolean {
  return Boolean(code()) && safeEqual(candidate.trim(), code());
}

export function createUploadSessionToken(): string {
  const expiresAt = Date.now() + UPLOAD_COOKIE_MAX_AGE * 1000;
  const payload = Buffer.from(String(expiresAt)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret())
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyUploadSessionToken(token: string | undefined): boolean {
  if (!token || !secret()) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expected = crypto
    .createHmac("sha256", secret())
    .update(payload)
    .digest("base64url");
  if (!safeEqual(signature, expected)) return false;

  try {
    const expiresAt = Number(Buffer.from(payload, "base64url").toString());
    return Number.isFinite(expiresAt) && expiresAt > Date.now();
  } catch {
    return false;
  }
}

export async function hasUploadAccess(): Promise<boolean> {
  if (!isUploadAccessConfigured()) return false;
  const store = await cookies();
  return verifyUploadSessionToken(store.get(UPLOAD_COOKIE)?.value);
}
