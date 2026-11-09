import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { appUrl } from "@/lib/email";
import { currentMonth, parsePriceFile } from "@/lib/prices";
import {
  deletePriceList,
  deletePriceRecord,
  getVendorByToken,
  importVendorPrices,
  listPriceLists,
  listPriceRecords,
  listVendorSettings,
  priceSignals,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const vendor = new URL(request.url).searchParams.get("vendor");
  const [lists, records, settings, signals] = await Promise.all([
    listPriceLists(vendor),
    listPriceRecords(vendor),
    listVendorSettings(),
    priceSignals(),
  ]);
  const admin = await isAdmin();
  return NextResponse.json({
    lists,
    records,
    settings: admin
      ? settings
      : settings.map(({ name, email, uploadToken }) => ({ name, email, uploadToken })),
    signals,
    month: currentMonth(),
    admin,
    uploadBase: `${appUrl()}/vendor-upload`,
  });
}

export async function POST(request: Request) {
  const form = await request.formData();
  const token = String(form.get("token") || "").trim();
  const vendorFromForm = String(form.get("vendor") || "").trim();
  const month = String(form.get("month") || currentMonth()).trim();
  const uploadedBy = String(form.get("uploadedBy") || (token ? "Vendor upload" : "Manager")).trim();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Attach a spreadsheet (CSV or Excel)." }, { status: 400 });
  }
  let vendor = vendorFromForm;
  if (token) {
    const setting = await getVendorByToken(token);
    if (!setting) return NextResponse.json({ error: "This upload link is not valid." }, { status: 401 });
    vendor = setting.name;
  }
  if (!vendor) return NextResponse.json({ error: "Pick a vendor." }, { status: 400 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const lines = await parsePriceFile(file.name, bytes);
  if (!lines.length) {
    return NextResponse.json(
      { error: "No item prices found. Use a column for the item name and a column for unit price." },
      { status: 400 }
    );
  }
  const result = await importVendorPrices({
    vendor,
    month,
    uploadedBy,
    fileName: file.name,
    lines,
  });
  return NextResponse.json(result);
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Admin only." }, { status: 401 });
  }
  const params = new URL(request.url).searchParams;
  const listId = params.get("list");
  const recordId = params.get("record");
  if (listId) await deletePriceList(listId);
  if (recordId) await deletePriceRecord(recordId);
  if (!listId && !recordId) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
