import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { deleteVendorSetting, listVendorSettings, updateVendorSetting } from "@/lib/store";

export const dynamic = "force-dynamic";

function contactPatch(body: Record<string, unknown>) {
  const patch: { email?: string; contactName?: string; phone?: string } = {};
  if (typeof body.email === "string") patch.email = body.email.trim();
  if (typeof body.contactName === "string") patch.contactName = body.contactName.trim();
  if (typeof body.phone === "string") patch.phone = body.phone.trim();
  return patch;
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Admin only." }, { status: 401 });
  }
  return NextResponse.json({ settings: await listVendorSettings(), admin: true });
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Admin only." }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ error: "Vendor name is required." }, { status: 400 });
  const setting = await updateVendorSetting(name, contactPatch(body));
  return NextResponse.json({ setting });
}

export async function PATCH(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Admin only." }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ error: "Vendor is required." }, { status: 400 });
  const updated = await updateVendorSetting(name, contactPatch(body));
  return NextResponse.json({ setting: updated });
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Admin only." }, { status: 401 });
  }
  const name = new URL(request.url).searchParams.get("name")?.trim() || "";
  if (!name) return NextResponse.json({ error: "Vendor is required." }, { status: 400 });
  const removed = await deleteVendorSetting(name);
  if (!removed) {
    return NextResponse.json({ error: "House vendors cannot be deleted." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
