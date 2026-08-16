import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StorageHealth = {
  status: "ok" | "warning";
  usedPercent: number;
  availableKb: number;
  thresholdPercent: number;
  checkedAt: string;
};

export async function GET() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Sesja wygasła." }, { status: 401 });
  }

  const path = process.env.STORAGE_MONITOR_STATUS_FILE ?? "/run/wedding-monitor/status.json";
  try {
    const parsed = JSON.parse(await readFile(path, "utf8")) as Partial<StorageHealth>;
    if (
      (parsed.status !== "ok" && parsed.status !== "warning") ||
      typeof parsed.usedPercent !== "number" ||
      typeof parsed.availableKb !== "number" ||
      typeof parsed.thresholdPercent !== "number" ||
      typeof parsed.checkedAt !== "string"
    ) {
      throw new Error("Nieprawidłowy format statusu");
    }
    const stale = Date.now() - Date.parse(parsed.checkedAt) > 3 * 60 * 1000;
    return NextResponse.json({ ...parsed, stale });
  } catch (error) {
    console.error("[admin/storage-health] brak statusu dysku", error);
    return NextResponse.json(
      { error: "Monitoring dysku nie odpowiada." },
      { status: 503 },
    );
  }
}

