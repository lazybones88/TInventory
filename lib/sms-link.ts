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
