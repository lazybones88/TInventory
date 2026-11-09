export type Shift = "day" | "night";

export function defaultShift(now = new Date()): Shift {
  const hour = now.getHours();
  return hour >= 5 && hour < 16 ? "day" : "night";
}

export function shiftLabel(shift?: string | null) {
  if (shift === "night") return "Night shift";
  if (shift === "day") return "Day shift";
  return "";
}

export function draftId(type: string, date: string, shift?: string | null) {
  if (type === "prep" && (shift === "day" || shift === "night")) {
    return `prep-${date}-${shift}`;
  }
  return `${type}-${date}`;
}
