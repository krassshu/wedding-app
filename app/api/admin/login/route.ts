import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  ADMIN_COOKIE_MAX_AGE,
  checkPassword,
  createSessionToken,
  isAdminConfigured,
} from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "Panel administratora nie jest skonfigurowany." },
      { status: 503 },
    );
  }

  const body = (await req.json().catch(() => null)) as { password?: unknown } | null;
  const password = typeof body?.password === "string" ? body.password : "";

  if (password.length === 0) {
    return NextResponse.json({ error: "Podaj hasło." }, { status: 400 });
  }

  if (!checkPassword(password)) {
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ error: "Nieprawidłowe hasło." }, { status: 401 });
  }

  try {
    const res = NextResponse.json({ ok: true });
    res.cookies.set(ADMIN_COOKIE, createSessionToken(), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: ADMIN_COOKIE_MAX_AGE,
    });
    return res;
  } catch (err) {
    console.error("[admin/login] nie udało się utworzyć sesji", err);
    return NextResponse.json(
      { error: "Nie udało się utworzyć sesji. Spróbuj ponownie." },
      { status: 500 },
    );
  }
}
