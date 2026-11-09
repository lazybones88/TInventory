import type { InventoryItem, PriceChange, VendorPriceLine } from "./types";

export function currentMonth() {
  return new Date().toLocaleDateString("en-CA").slice(0, 7);
}

export function normalizePriceName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function parseMoney(value: string) {
  const cleaned = value.replace(/[^0-9.-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === ".") return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : null;
}

function splitCsvLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === delimiter && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function detectDelimiter(text: string) {
  const sample = text.split(/\r?\n/).slice(0, 8).join("\n");
  const commas = (sample.match(/,/g) || []).length;
  const tabs = (sample.match(/\t/g) || []).length;
  const semis = (sample.match(/;/g) || []).length;
  if (tabs > commas && tabs >= semis) return "\t";
  if (semis > commas) return ";";
  return ",";
}

function headerIndex(headers: string[], aliases: string[]) {
  return headers.findIndex((header) => aliases.some((alias) => header.includes(alias)));
}

export async function parsePriceFile(fileName: string, bytes: Uint8Array | string) {
  const name = fileName.toLowerCase();
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(bytes, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return parsePriceSpreadsheet(XLSX.utils.sheet_to_csv(sheet));
  }
  const text = typeof bytes === "string" ? bytes : new TextDecoder().decode(bytes);
  return parsePriceSpreadsheet(text);
}

export function parsePriceSpreadsheet(text: string): VendorPriceLine[] {
  const raw = text.replace(/^\uFEFF/, "").trim();
  if (!raw) return [];
  const delimiter = detectDelimiter(raw);
  const rows = raw
    .split(/\r?\n/)
    .map((line) => splitCsvLine(line, delimiter))
    .filter((row) => row.some((cell) => cell));
  if (!rows.length) return [];

  const first = rows[0].map((cell) => cell.toLowerCase());
  const nameIdx = headerIndex(first, ["item", "name", "product", "description", "desc"]);
  const priceIdx = headerIndex(first, ["unit price", "unitprice", "price", "cost", "each"]);
  const unitIdx = headerIndex(first, ["unit", "uom", "pack"]);
  const skuIdx = headerIndex(first, ["sku", "item #", "item no", "code", "number"]);
  const hasHeader = nameIdx >= 0 && priceIdx >= 0;
  const start = hasHeader ? 1 : 0;
  const nameCol = hasHeader ? nameIdx : 0;
  const priceCol = hasHeader ? priceIdx : 1;
  const unitCol = hasHeader && unitIdx >= 0 ? unitIdx : -1;
  const skuCol = hasHeader && skuIdx >= 0 ? skuIdx : -1;

  const lines: VendorPriceLine[] = [];
  for (const row of rows.slice(start)) {
    const name = (row[nameCol] || "").trim();
    const price = parseMoney(row[priceCol] || "");
    if (!name || price == null) continue;
    lines.push({
      name,
      price,
      unit: unitCol >= 0 ? row[unitCol] || undefined : undefined,
      sku: skuCol >= 0 ? row[skuCol] || undefined : undefined,
    });
  }
  return lines;
}

export function matchPriceLines(lines: VendorPriceLine[], items: InventoryItem[], vendor: string) {
  const vendorItems = items.filter((item) => item.type === "ordering" && (item.vendor || "") === vendor);
  const byName = new Map(vendorItems.map((item) => [normalizePriceName(item.name), item]));
  return lines.map((line) => {
    const match = byName.get(normalizePriceName(line.name));
    return match ? { ...line, itemId: match.id, unit: line.unit || match.unit } : line;
  });
}

export function comparePriceLists(
  vendor: string,
  previous: VendorPriceLine[] | undefined,
  current: VendorPriceLine[]
): PriceChange[] {
  const prevMap = new Map((previous || []).map((line) => [normalizePriceName(line.name), line]));
  const currMap = new Map(current.map((line) => [normalizePriceName(line.name), line]));
  const names = new Set([...prevMap.keys(), ...currMap.keys()]);
  const changes: PriceChange[] = [];
  for (const name of names) {
    const before = prevMap.get(name);
    const after = currMap.get(name);
    if (before && !after) {
      changes.push({
        name: before.name,
        vendor,
        itemId: before.itemId,
        previousPrice: before.price,
        currentPrice: null,
        direction: "removed",
      });
      continue;
    }
    if (!before && after) {
      changes.push({
        name: after.name,
        vendor,
        itemId: after.itemId,
        previousPrice: null,
        currentPrice: after.price,
        direction: "new",
      });
      continue;
    }
    if (before && after && before.price !== after.price) {
      changes.push({
        name: after.name,
        vendor,
        itemId: after.itemId || before.itemId,
        previousPrice: before.price,
        currentPrice: after.price,
        direction: after.price > before.price ? "up" : "down",
      });
    }
  }
  return changes.sort((a, b) => a.name.localeCompare(b.name));
}

export function previousMonth(month: string) {
  const [year, mon] = month.split("-").map(Number);
  const date = new Date(year, mon - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMoney(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `$${value.toFixed(2)}`;
}
