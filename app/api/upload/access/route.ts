import { NextResponse } from "next/server";
import { clientIp, takeRateLimit } from "@/lib/rateLimit";
import {
  UPLOAD_COOKIE,
  UPLOAD_COOKIE_MAX_AGE,
  checkUploadCode,
  createUploadSessionToken,
  hasUploadAccess,
  isUploadAccessConfigured,
} from "@/lib/uploadAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isUploadAccessConfigured()) {
    return NextResponse.json(
      { authorized: false, error: "Wysyłanie nie jest skonfigurowane." },
      { status: 503 },
    );
  }
  return NextResponse.json({ authorized: await hasUploadAccess() });
}

export async function POST(req: Request) {
  if (!isUploadAccessConfigured()) {
    return NextResponse.json(
      { error: "Wysyłanie nie jest skonfigurowane." },
      { status: 503 },
    );
  }

  // Wiele telefonów na sali może mieć ten sam publiczny adres Wi-Fi.
  const rate = takeRateLimit(`upload-login:${clientIp(req)}`, 60, 15 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Za dużo prób. Spróbuj ponownie później." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  const body = (await req.json().catch(() => null)) as { code?: unknown } | null;
  const candidate = typeof body?.code === "string" ? body.code : "";
  if (!checkUploadCode(candidate)) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    return NextResponse.json({ error: "Nieprawidłowy kod weselny." }, { status: 401 });
  }

  const response = NextResponse.json({ authorized: true });
  response.cookies.set(UPLOAD_COOKIE, createUploadSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: UPLOAD_COOKIE_MAX_AGE,
  });
  return response;
}
