import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { deleteSheet, deleteTestRecords, getReport, listReports, listSheets } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (id) {
    const report = await getReport(id);
    if (!report) return NextResponse.json({ error: "Report not found." }, { status: 404 });
    return NextResponse.json({ report });
  }
  const type = url.searchParams.get("type");
  const all = url.searchParams.get("all");
  if (all === "1") {
    const sheets = (await listSheets()).filter((sheet) => (type ? sheet.type === type : true));
    return NextResponse.json({ sheets });
  }
  return NextResponse.json({ reports: await listReports(type) });
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
