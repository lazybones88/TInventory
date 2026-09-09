import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { readDb, updateDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const admin = await isAdmin();
  const db = readDb();
  const item = db.items.find((entry) => entry.id === id);
  if (!item) return NextResponse.json({ error: "Item not found." }, { status: 404 });

  updateDb((store) => {
    const target = store.items.find((entry) => entry.id === id);
    if (!target) return;
    if (typeof body.name === "string" && body.name.trim()) target.name = body.name.trim();
    if (typeof body.category === "string" && body.category.trim()) target.category = body.category.trim();
    if (typeof body.unit === "string" && body.unit.trim()) target.unit = body.unit.trim();
    if (admin && body.par !== undefined) {
      const par = Number(body.par);
      if (Number.isFinite(par) && par >= 0) target.par = par;
    }
  });
  return NextResponse.json({ item: readDb().items.find((entry) => entry.id === id) });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Admin only." }, { status: 401 });
  }
  const { id } = await params;
  updateDb((db) => {
    db.items = db.items.filter((item) => item.id !== id);
  });
  return NextResponse.json({ ok: true });
}
