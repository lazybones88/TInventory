import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { deleteItem, getItem, updateItem } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const admin = await isAdmin();
  const item = await getItem(id);
  if (!item) return NextResponse.json({ error: "Item not found." }, { status: 404 });

  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
  if (typeof body.category === "string" && body.category.trim()) patch.category = body.category.trim();
  if (typeof body.unit === "string" && body.unit.trim()) patch.unit = body.unit.trim();
  if (admin && body.par !== undefined) {
    const par = Number(body.par);
    if (Number.isFinite(par) && par >= 0) patch.par = par;
  }
  const updated = await updateItem(id, patch);
  return NextResponse.json({ item: updated });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Admin only." }, { status: 401 });
  }
  const { id } = await params;
  await deleteItem(id);
  return NextResponse.json({ ok: true });
}
