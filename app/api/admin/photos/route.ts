import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/adminAuth";
import { adminListPhotos } from "@/lib/adminSupabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 401 });
  }
  try {
    const photos = await adminListPhotos();
    return NextResponse.json({ photos });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Błąd listowania" },
      { status: 500 },
    );
  }
}
