import { NextResponse } from "next/server";
import { clientIp, takeRateLimit } from "@/lib/rateLimit";
import { createUploadJwt, hasUploadAccess } from "@/lib/uploadAuth";
import { isValidUploadDescriptor } from "@/lib/uploadPolicy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await hasUploadAccess())) {
    return NextResponse.json({ error: "Podaj kod weselny." }, { status: 401 });
  }

  // Limit jest wysoki celowo: goście za NAT-em współdzielą jeden adres IP.
  const rate = takeRateLimit(`upload-ticket:${clientIp(req)}`, 600, 10 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Za dużo plików naraz. Odczekaj chwilę." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  const body = (await req.json().catch(() => null)) as {
    path?: unknown;
    size?: unknown;
    type?: unknown;
  } | null;
  const path = typeof body?.path === "string" ? body.path : "";
  const size = typeof body?.size === "number" ? body.size : NaN;
  const type = typeof body?.type === "string" ? body.type : "";
  if (!isValidUploadDescriptor(path, size, type)) {
    return NextResponse.json({ error: "Nieprawidłowy plik do wysłania." }, { status: 400 });
  }

  if ((process.env.JWT_SECRET ?? "").length < 32) {
    return NextResponse.json(
      { error: "Serwer wysyłania nie jest skonfigurowany." },
      { status: 503 },
    );
  }

  // JWT jest krótkotrwały, a polityka RLS wiąże go dokładnie z jedną ścieżką.
  return NextResponse.json({ token: createUploadJwt(path) });
}
