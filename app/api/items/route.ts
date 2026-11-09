import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { CITY_PRODUCE, cityProduceSection, PRODUCE_SECTIONS } from "@/lib/catalog";
import { createItem, listItems } from "@/lib/store";
import { parseItemType, type ItemType } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const type = new URL(request.url).searchParams.get("type") as ItemType | null;
  const items = await listItems(type);
  return NextResponse.json({ items, admin: await isAdmin() });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  let category = String(body.category || "Uncategorized").trim() || "Uncategorized";
  const unit = String(body.unit || "each").trim() || "each";
  const type: ItemType = parseItemType(body.type);
  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });

  const admin = await isAdmin();
  const vendor = type === "ordering" ? String(body.vendor || "").trim() : "";
  if (vendor === CITY_PRODUCE && !(PRODUCE_SECTIONS as readonly string[]).includes(category)) {
    category = cityProduceSection(name);
  }
  const created = {
    id: crypto.randomUUID(),
    type,
    name,
    category,
    unit,
    par: admin ? Number(body.par) || 0 : 0,
    vendor: vendor || undefined,
    createdAt: new Date().toISOString(),
  };
  await createItem(created);
  return NextResponse.json({ item: created });
}
