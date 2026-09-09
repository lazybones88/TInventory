import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Admin only." }, { status: 401 });
  }
  const type = new URL(request.url).searchParams.get("type");
  const reports = readDb()
    .reports.filter((report) => (type ? report.type === type : true))
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  return NextResponse.json({ reports });
}
