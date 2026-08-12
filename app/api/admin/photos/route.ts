import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/adminAuth";
import { adminConfigured, adminListPhotos } from "@/lib/adminSupabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
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

  try {
    const photos = await adminListPhotos();
    return NextResponse.json({ photos });
  } catch (err) {
    console.error("[admin/photos] listowanie nie powiodło się", err);
    return NextResponse.json(
      { error: "Nie udało się pobrać listy plików z serwera zdjęć." },
      { status: 502 },
    );
  }
}
