import { CITY_PRODUCE, sortCityProduce } from "./catalog";
import { hasQty, qtyText } from "./qty";
import type { Report } from "./types";

export type VendorTextResult = {
  vendor: string;
  phone: string;
  sent: boolean;
  skipped?: "no-phone" | "text-off" | "nothing-ordered" | "not-configured";
  error?: string;
};

export function smsConfigured() {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM);
}

export function toE164(phone: string) {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (trimmed.startsWith("+") && digits.length >= 10) return `+${digits}`;
  return "";
}

export function formatVendorSms(report: Report, vendor: string, lines: Report["lines"]) {
  const ordered = lines.filter((line) => hasQty(line.orderQty));
  const sorted = vendor === CITY_PRODUCE ? sortCityProduce(ordered) : ordered;
  const header = `Tamara's Downtown ${vendor} order ${report.date}`;
  const body = sorted
    .map((line) => {
      const qty = qtyText(line.orderQty) || "0";
      return `${line.name}: ${qty} ${line.unit}`.trim();
    })
    .join("\n");
  let text = body ? `${header}\n${body}` : header;
  if (text.length > 1500) {
    text = `${text.slice(0, 1450).trim()}\n…`;
  }
  return text;
}

export async function sendSms(to: string, body: string) {
  if (!smsConfigured()) {
    return {
      sent: false as const,
      error: "Texting is not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM on Vercel.",
    };
  }
  const sid = process.env.TWILIO_ACCOUNT_SID || "";
  const token = process.env.TWILIO_AUTH_TOKEN || "";
  const from = process.env.TWILIO_FROM || "";
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }),
  });
  const data = (await res.json().catch(() => ({}))) as { message?: string; code?: number };
  if (!res.ok) {
    return { sent: false as const, error: data.message || `Text failed (${res.status}).` };
  }
  return { sent: true as const };
}

export async function sendVendorOrderText(input: {
  vendor: string;
  phone: string;
  report: Report;
  lines: Report["lines"];
}): Promise<VendorTextResult> {
  const phone = toE164(input.phone);
  if (!phone) {
    return { vendor: input.vendor, phone: input.phone, sent: false, skipped: "no-phone" };
  }
  if (!input.lines.some((line) => hasQty(line.orderQty))) {
    return { vendor: input.vendor, phone, sent: false, skipped: "nothing-ordered" };
  }
  if (!smsConfigured()) {
    return { vendor: input.vendor, phone, sent: false, skipped: "not-configured" };
  }
  try {
    const result = await sendSms(phone, formatVendorSms(input.report, input.vendor, input.lines));
    return {
      vendor: input.vendor,
      phone,
      sent: result.sent,
      error: result.sent ? undefined : result.error,
    };
  } catch (error) {
    return {
      vendor: input.vendor,
      phone,
      sent: false,
      error: error instanceof Error ? error.message : "Text failed.",
    };
  }
}

export function wantsOrderText(vendor: string, setting?: { textOrders?: boolean } | null) {
  if (setting?.textOrders === false) return false;
  if (setting?.textOrders === true) return true;
  return vendor === CITY_PRODUCE;
}
