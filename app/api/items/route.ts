import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { readDb, updateDb } from "@/lib/store";
import type { ItemType } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const type = new URL(request.url).searchParams.get("type") as ItemType | null;
  const items = readDb().items.filter((item) => (type ? item.type === type : true));
  items.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  return NextResponse.json({ items, admin: await isAdmin() });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const category = String(body.category || "Uncategorized").trim() || "Uncategorized";
  const unit = String(body.unit || "ea").trim() || "ea";
  const type: ItemType = body.type === "ordering" ? "ordering" : "prep";
  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });

  const admin = await isAdmin();
  const par = admin ? Number(body.par) || 0 : 0;
  const created = {
    id: crypto.randomUUID(),
    type,
    name,
    category,
    unit,
    par,
    createdAt: new Date().toISOString(),
  };
  updateDb((db) => {
    db.items.push(created);
  });
  return NextResponse.json({ item: created });
}
