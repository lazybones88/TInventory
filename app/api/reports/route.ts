import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { deleteSheet, deleteTestRecords, findLatestSent, getReport, listReports, listSheets, reopenReport } from "@/lib/store";
import { parseItemType, type Shift } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (id) {
    const report = await getReport(id);
    if (!report) return NextResponse.json({ error: "Report not found." }, { status: 404 });
    return NextResponse.json({ report });
  }
  const typeParam = url.searchParams.get("type");
  const date = url.searchParams.get("date");
  const shift = url.searchParams.get("shift") as Shift | null;
  if (url.searchParams.get("sent") === "1" && typeParam && date) {
    const sent = await findLatestSent(parseItemType(typeParam), date, shift);
    return NextResponse.json({ sent, locked: Boolean(sent && !sent.reopened) });
  }
  const all = url.searchParams.get("all");
  if (all === "1") {
    const sheets = (await listSheets()).filter((sheet) => (typeParam ? sheet.type === typeParam : true));
    return NextResponse.json({ sheets });
  }
  return NextResponse.json({ reports: await listReports(typeParam) });
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Admin only." }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const id = String(body.id || "").trim();
  if (!id || !body.reopen) {
    return NextResponse.json({ error: "Report id is required." }, { status: 400 });
  }
  const report = await reopenReport(id);
  if (!report) return NextResponse.json({ error: "Report not found." }, { status: 404 });
  return NextResponse.json({ report });
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Admin only." }, { status: 401 });
  }
  const url = new URL(request.url);
  if (url.searchParams.get("tests") === "1") {
    const result = await deleteTestRecords();
    return NextResponse.json({ ok: true, ...result });
  }
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Record id is required." }, { status: 400 });
  await deleteSheet(id);
  return NextResponse.json({ ok: true });
}
