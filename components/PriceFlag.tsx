import { formatMoney } from "@/lib/prices";
import type { PriceSignal } from "@/lib/types";

export function PriceFlag({ signal }: { signal?: PriceSignal }) {
  if (!signal) return null;
  if (signal.direction === "up") {
    return (
      <span className="ml-2 inline-flex items-center rounded-full bg-[#f8e4c8] px-2 py-0.5 text-xs font-semibold text-wine">
        ↑ {formatMoney(signal.current)}
        {signal.previous != null ? ` from ${formatMoney(signal.previous)}` : ""}
      </span>
    );
  }
  if (signal.direction === "down") {
    return (
      <span className="ml-2 inline-flex items-center rounded-full bg-[#e7efe0] px-2 py-0.5 text-xs font-semibold text-olive">
        ↓ {formatMoney(signal.current)}
        {signal.previous != null ? ` from ${formatMoney(signal.previous)}` : ""}
      </span>
    );
  }
  if (signal.current != null) {
    return <span className="ml-2 text-xs text-muted">{formatMoney(signal.current)}</span>;
  }
  return null;
}
