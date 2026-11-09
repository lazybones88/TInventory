import { NextResponse } from "next/server";
import { appUrl, sendVendorPriceRequest } from "@/lib/email";
import { currentMonth } from "@/lib/prices";
import { listVendorSettings } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const vendor = String(body.vendor || "").trim();
  const month = String(body.month || currentMonth()).trim();
  const settings = await listVendorSettings();
  const targets = settings.filter((entry) => (vendor ? entry.name === vendor : true) && entry.email?.trim());
  if (!targets.length) {
    return NextResponse.json({ error: "Add a vendor email first." }, { status: 400 });
  }
  const results = [];
  for (const target of targets) {
    const uploadUrl = `${appUrl()}/vendor-upload/${target.uploadToken}?month=${month}`;
    const sent = await sendVendorPriceRequest({
      vendor: target.name,
      email: target.email!,
      month,
      uploadUrl,
    });
    results.push({ vendor: target.name, email: target.email, sent: sent.sent, error: sent.error });
  }
  return NextResponse.json({ results });
}
