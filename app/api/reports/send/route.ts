import { NextResponse } from "next/server";
import { sendReportEmail } from "@/lib/email";
import { exceedsPar } from "@/lib/par";
import { countValue } from "@/lib/qty";
import { itemVendor } from "@/lib/catalog";
import { applyCountsToItems, clearDraft, clearSentVendorDraft, createReport, findLatestSent, listVendorSettings } from "@/lib/store";
import { parseItemType, type Report, type ReportLine, type Shift } from "@/lib/types";

export const maxDuration = 60;

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const type = parseItemType(body.type);
  const date = String(body.date || new Date().toISOString().slice(0, 10));
  const submittedBy = String(body.submittedBy || "Staff").trim() || "Staff";
  const lines = Array.isArray(body.lines) ? (body.lines as ReportLine[]) : [];
  if (lines.length === 0) {
    return NextResponse.json({ error: "Add at least one inventory line." }, { status: 400 });
  }

  const missingReasons = lines.filter((line) => {
    return (
      type === "prep" &&
      exceedsPar(Number(line.par) || 0, line.onHand, line.madeToday) &&
      !String(line.overParReason || "").trim()
    );
  });
  if (missingReasons.length > 0) {
    return NextResponse.json(
      {
        error: "A reason is required when on hand plus made today is over par.",
        items: missingReasons.map((line) => line.name),
      },
      { status: 400 }
    );
  }

  const shift: Shift | undefined = type === "prep" ? (body.shift === "night" ? "night" : "day") : undefined;
  const vendor = type === "ordering" ? String(body.vendor || "").trim() : "";
  if (type === "ordering" && !vendor) {
    return NextResponse.json({ error: "Pick a vendor first. Send one house at a time." }, { status: 400 });
  }
  const scopedLines = type === "ordering" ? lines.filter((line) => itemVendor(line) === vendor) : lines;
  if (type === "ordering" && scopedLines.length === 0) {
    return NextResponse.json({ error: `No ${vendor} items to send.` }, { status: 400 });
  }

  const already = await findLatestSent(type, date, shift, vendor || null);
  if (already && !already.reopened) {
    return NextResponse.json(
      {
        error: `${vendor || "This sheet"} was already sent. An admin can reopen it if something needs to change.`,
        alreadySent: true,
        reportId: already.id,
      },
      { status: 409 }
    );
  }

  const report: Report = {
    id: crypto.randomUUID(),
    type,
    date,
    submittedAt: new Date().toISOString(),
    submittedBy,
    emailed: false,
    shift,
    vendor: vendor || undefined,
    lines: scopedLines.map((line) => ({
      itemId: String(line.itemId || ""),
      name: String(line.name || ""),
      category: String(line.category || ""),
      unit: String(line.unit || ""),
      par: Number(line.par) || 0,
      vendor: line.vendor ? String(line.vendor) : undefined,
      onHand: countValue(line.onHand),
      madeToday: type === "prep" ? countValue(line.madeToday) : undefined,
      orderQty: type === "ordering" || type === "pull" ? countValue(line.orderQty) : undefined,
      overParReason: line.overParReason ? String(line.overParReason) : undefined,
    })),
  };

  let emailError: string | undefined;
  let vendorEmails: Awaited<ReturnType<typeof sendReportEmail>>["vendors"] = [];
  let vendorTexts: Awaited<ReturnType<typeof sendReportEmail>>["texts"] = [];
  try {
    const settings = report.type === "ordering" ? await listVendorSettings() : [];
    const result = await sendReportEmail(report, settings);
    report.emailed = result.sent;
    vendorEmails = result.vendors;
    vendorTexts = result.texts;
    if (!result.sent) emailError = result.error;
    const vendorFails = result.vendors.filter((entry) => entry.email && !entry.sent && !entry.skipped);
    if (vendorFails.length) {
      const note = vendorFails.map((entry) => `${entry.vendor}: ${entry.error || "failed"}`).join("; ");
      emailError = emailError ? `${emailError} ${note}` : note;
    }
    const textFails = result.texts.filter((entry) => !entry.sent && !entry.skipped);
    if (textFails.length) {
      const note = textFails.map((entry) => `${entry.vendor} text: ${entry.error || "failed"}`).join("; ");
      emailError = emailError ? `${emailError} ${note}` : note;
    }
  } catch (error) {
    emailError = error instanceof Error ? error.message : "Email failed.";
    report.emailError = emailError;
  }

  if (emailError) report.emailError = emailError;
  await createReport(report);
  await applyCountsToItems(type, report.lines);
  if (type === "ordering" && vendor) {
    await clearSentVendorDraft(type, date, vendor);
  } else {
    await clearDraft(type, date, shift);
  }

  return NextResponse.json({
    report,
    emailed: report.emailed,
    emailError,
    vendorEmails,
    vendorTexts,
  });
}
