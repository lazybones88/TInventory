import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { createItem, listItems } from "@/lib/store";
import type { ItemType } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const type = new URL(request.url).searchParams.get("type") as ItemType | null;
  const items = await listItems(type);
  return NextResponse.json({ items, admin: await isAdmin() });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const category = String(body.category || "Uncategorized").trim() || "Uncategorized";
  const unit = String(body.unit || "each").trim() || "each";
  const type: ItemType = body.type === "ordering" ? "ordering" : "prep";
  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });

  const admin = await isAdmin();
  const created = {
    id: crypto.randomUUID(),
    type,
    name,
    category,
    unit,
    par: admin ? Number(body.par) || 0 : 0,
    createdAt: new Date().toISOString(),
  };
  await createItem(created);
  return NextResponse.json({ item: created });
}
