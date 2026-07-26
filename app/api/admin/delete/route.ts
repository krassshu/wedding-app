import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/adminAuth";
import { adminDeletePhotos } from "@/lib/adminSupabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { paths?: unknown } | null;
  const paths = Array.isArray(body?.paths) ? (body.paths as unknown[]) : [];
  const strings = paths.filter((p): p is string => typeof p === "string");

  if (strings.length === 0) {
    return NextResponse.json({ error: "Nie wybrano plików" }, { status: 400 });
  }

  try {
    const removed = await adminDeletePhotos(strings);
    return NextResponse.json({ ok: true, removed });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Błąd usuwania" },
      { status: 500 },
    );
  }
}
