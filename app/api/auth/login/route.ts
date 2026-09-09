import { NextResponse } from "next/server";
import { adminPassword, adminUser, setAdminCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const username = String(body.username || "").trim();
  const password = String(body.password || "");
  if (username !== adminUser() || password !== adminPassword()) {
    return NextResponse.json({ error: "Wrong username or password." }, { status: 401 });
  }
  await setAdminCookie();
  return NextResponse.json({ ok: true });
}
