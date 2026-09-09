import { NextResponse } from "next/server";
import { sendReportEmail } from "@/lib/email";
import { updateDb } from "@/lib/store";
import type { Report, ReportLine } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const type = body.type === "ordering" ? "ordering" : "prep";
  const date = String(body.date || new Date().toISOString().slice(0, 10));
  const submittedBy = String(body.submittedBy || "Staff").trim() || "Staff";
  const lines = Array.isArray(body.lines) ? (body.lines as ReportLine[]) : [];
  if (lines.length === 0) {
    return NextResponse.json({ error: "Add at least one inventory line." }, { status: 400 });
  }

  const missingReasons = lines.filter((line) => {
    const made = Number(line.madeToday) || 0;
    const par = Number(line.par) || 0;
    return type === "prep" && par > 0 && made > par && !String(line.overParReason || "").trim();
  });
  if (missingReasons.length > 0) {
    return NextResponse.json(
      {
        error: "A reason is required when you make more than par.",
        items: missingReasons.map((line) => line.name),
      },
      { status: 400 }
    );
  }

  const report: Report = {
    id: crypto.randomUUID(),
    type,
    date,
    submittedAt: new Date().toISOString(),
    submittedBy,
    emailed: false,
    lines: lines.map((line) => ({
      itemId: String(line.itemId || ""),
      name: String(line.name || ""),
      category: String(line.category || ""),
      unit: String(line.unit || ""),
      par: Number(line.par) || 0,
      onHand: Number(line.onHand) || 0,
      madeToday: type === "prep" ? Number(line.madeToday) || 0 : undefined,
      orderQty: type === "ordering" ? Number(line.orderQty) || 0 : undefined,
      overParReason: line.overParReason ? String(line.overParReason) : undefined,
    })),
  };

  let emailError: string | undefined;
  try {
    const result = await sendReportEmail(report);
    report.emailed = result.sent;
    if (!result.sent) emailError = result.error;
  } catch (error) {
    emailError = error instanceof Error ? error.message : "Email failed.";
    report.emailError = emailError;
  }

  updateDb((db) => {
    db.reports.unshift(report);
  });

  return NextResponse.json({
    report,
    emailed: report.emailed,
    emailError,
  });
}
