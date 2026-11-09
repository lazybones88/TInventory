export type CountValue = string | number;

export function qtyText(value: unknown) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

export function qtyAmount(value: unknown) {
  const text = qtyText(value);
  if (!text) return 0;
  const match = text.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

export function hasQty(value: unknown) {
  const text = qtyText(value);
  if (!text) return false;
  if (/^0+(?:\.0+)?$/.test(text)) return false;
  return true;
}

export function countValue(value: unknown): CountValue {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return qtyText(value);
}
