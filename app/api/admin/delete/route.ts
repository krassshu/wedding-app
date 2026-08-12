import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/adminAuth";
import { adminConfigured, adminDeletePhotos, isSafePath } from "@/lib/adminSupabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json(
      { error: "Sesja wygasła. Zaloguj się ponownie." },
      { status: 401 },
    );
  }

  if (!adminConfigured()) {
    return NextResponse.json(
      { error: "Serwer zdjęć nie jest skonfigurowany." },
      { status: 503 },
    );
  }

  const body = (await req.json().catch(() => null)) as { paths?: unknown } | null;

  if (!body || !Array.isArray(body.paths)) {
    return NextResponse.json(
      { error: "Nieprawidłowe żądanie — brak listy plików." },
      { status: 400 },
    );
  }

  const safe = (body.paths as unknown[]).filter(isSafePath);

  if (safe.length === 0) {
    return NextResponse.json(
      { error: "Nie wybrano poprawnych plików do usunięcia." },
      { status: 400 },
    );
  }

  try {
    const removed = await adminDeletePhotos(safe);
    return NextResponse.json({ ok: true, removed });
  } catch (err) {
    console.error("[admin/delete] usuwanie nie powiodło się", err);
    return NextResponse.json(
      { error: "Nie udało się usunąć plików z serwera zdjęć." },
      { status: 502 },
    );
  }
}
