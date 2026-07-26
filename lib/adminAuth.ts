import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "wedding_admin";
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 12;

function sessionSecret(): string {
  return process.env.ADMIN_SESSION_SECRET ?? "";
}

export function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_SESSION_SECRET);
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export function checkPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD ?? "";
  if (!expected) return false;
  return safeEqual(input, expected);
}

export function createSessionToken(): string {
  const exp = Date.now() + ADMIN_COOKIE_MAX_AGE * 1000;
  const payload = String(exp);
  const sig = crypto.createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${sig}`;
}

function verifySessionToken(token: string | undefined): boolean {
  if (!token || !sessionSecret()) return false;
  const [encoded, sig] = token.split(".");
  if (!encoded || !sig) return false;
  let payload: string;
  try {
    payload = Buffer.from(encoded, "base64url").toString();
  } catch {
    return false;
  }
  const expected = crypto.createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
  if (!safeEqual(sig, expected)) return false;
  const exp = Number(payload);
  return Number.isFinite(exp) && exp > Date.now();
}

export async function isAuthed(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(ADMIN_COOKIE)?.value);
}
