import { NextResponse } from "next/server";
import { clientIp, takeRateLimit } from "@/lib/rateLimit";
import { createUploadJwt, hasUploadAccess } from "@/lib/uploadAuth";
import { PHOTOS_BUCKET, isValidUploadDescriptor } from "@/lib/uploadPolicy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function encodedObjectPath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function objectAlreadyStored(path: string, expectedSize: number): Promise<boolean> {
  const internalUrl = process.env.SUPABASE_INTERNAL_URL ?? "";
  if (!internalUrl) return false;

  try {
    const response = await fetch(
      `${internalUrl}/storage/v1/object/public/${PHOTOS_BUCKET}/${encodedObjectPath(path)}`,
      { method: "HEAD", cache: "no-store" },
    );
    if (!response.ok) return false;
    return Number(response.headers.get("content-length")) === expectedSize;
  } catch {
    // Kontrola jest optymalizacją naprawiającą utraconą odpowiedź. Jej awaria
    // nie może blokować normalnego uploadu TUS.
    return false;
  }
}

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

  // Odpowiedź kończąca TUS mogła zginąć, mimo że Storage zapisał cały obiekt.
  // Stała ścieżka i rozmiar pozwalają bezpiecznie domknąć trwałą kolejkę.
  if (await objectAlreadyStored(path, size)) {
    return NextResponse.json({ alreadyUploaded: true });
  }

  // JWT jest krótkotrwały, a polityka RLS wiąże go dokładnie z jedną ścieżką.
  return NextResponse.json({ token: createUploadJwt(path) });
}
