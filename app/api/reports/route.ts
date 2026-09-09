import { NextResponse } from "next/server";
import { getReport, listReports, listSheets } from "@/lib/store";

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
