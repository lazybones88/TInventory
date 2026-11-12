export function toE164(phone: string) {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (trimmed.startsWith("+") && digits.length >= 10) return `+${digits}`;
  return "";
}

export function smsHref(phone: string, body: string, ios = false) {
  const to = toE164(phone);
  const encoded = encodeURIComponent(body);
  return ios ? `sms:${to}&body=${encoded}` : `sms:${to}?body=${encoded}`;
}

export function openSms(phone: string, body: string) {
  const ios = typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);
  window.location.href = smsHref(phone, body, ios);
}

export function orderShareText(phone: string, body: string) {
  const to = toE164(phone) || phone.trim();
  if (!to) return body;
  return `To: ${to}\n\n${body}`;
}

export async function copyOrderText(phone: string, body: string) {
  const text = orderShareText(phone, body);
  await navigator.clipboard.writeText(text);
  return text;
}

export async function shareOrderText(phone: string, body: string): Promise<"shared" | "copied" | "cancelled"> {
  const text = orderShareText(phone, body);
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title: "Tamara's Downtown order", text });
      return "shared";
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return "cancelled";
    }
  }
  await copyOrderText(phone, body);
  return "copied";
}
