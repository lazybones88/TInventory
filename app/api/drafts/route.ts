import { NextResponse } from "next/server";
import { getDraft, listDrafts, upsertDraft } from "@/lib/store";
import { parseItemType, type ItemType, type ReportLine, type Shift } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type") as ItemType | null;
  const date = url.searchParams.get("date");
  const shift = url.searchParams.get("shift") as Shift | null;
  if (type && date) {
    return NextResponse.json({ draft: await getDraft(type, date, shift) });
  }
  return NextResponse.json({ drafts: await listDrafts(type) });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const type: ItemType = parseItemType(body.type);
  const date = String(body.date || new Date().toISOString().slice(0, 10));
  const submittedBy = String(body.submittedBy || "Staff").trim() || "Staff";
  const lines = Array.isArray(body.lines) ? (body.lines as ReportLine[]) : [];
  if (lines.length === 0) {
    return NextResponse.json({ error: "Nothing to save yet." }, { status: 400 });
  }
  const shift = body.shift === "night" || body.shift === "day" ? body.shift : type === "prep" ? "day" : undefined;
  const draft = await upsertDraft({ type, date, submittedBy, lines, shift });
  return NextResponse.json({ draft });
}
