import type { ItemType } from "./types";

export const PREP_CATEGORIES = [
  "Dressings",
  "Pasta",
  "Sauces & Condiments",
  "Dips",
  "Breakfast",
  "Soups",
  "Desserts",
  "Sides",
  "Appetizers",
  "Entrees",
] as const;

export const PULL_CATEGORIES = ["Beef", "Seafood"] as const;

export const ORDERING_CATEGORIES = [
  "Seafood",
  "Beef & Pork",
  "Poultry",
  "Walk-in",
  "Brunch cooler",
  "Bar cooler",
  "Produce",
  "Dairy & Eggs",
  "Dry Goods",
  "Bread & Bakery",
  "Paper & Disposables",
  "Wine & Spirits",
  "Beverages",
] as const;

export const CITY_PRODUCE = "City Produce";
export const PRODUCE_SECTIONS = ["Walk-in", "Brunch cooler", "Bar cooler"] as const;

const WALK_IN_LEAD = [
  "Romaine",
  "Spring Mix",
  "Arugula",
  "Head Lettuce",
  "Iceberg Heads",
  "Fresh Spinach",
  "Baby Spinach",
];

const BRUNCH_LEAD = ["Strawberries", "Parmesan", "Blueberries"];
const BAR_LEAD = ["Lemons", "Limes", "Oranges", "Mangoes", "Mangos"];

export const UNASSIGNED_VENDOR = "Unassigned";

export const VENDORS = [
  "City Produce",
  "Buckhead Meat",
  "Fresh Seafood",
  "Performance Foodservice",
  "Ben E. Keith",
  "Boar's Head",
  "Imperial Dade",
  "Alabama Crown",
] as const;

export type VendorName = (typeof VENDORS)[number];

export const RECIPE_CATEGORIES = [
  "Breakfast",
  "Dressings",
  "Sauces",
  "Dips",
  "Soups",
  "Pasta",
  "Sides",
  "Appetizers",
  "Entrees",
  "Desserts",
  "House",
] as const;

export function prepCategoryForRecipe(category: string) {
  if (category === "Sauces") return "Sauces & Condiments";
  if (category === "Seafood") return "Appetizers";
  if (category === "House") return "Sauces & Condiments";
  if (PREP_CATEGORIES.includes(category as (typeof PREP_CATEGORIES)[number])) return category;
  return "Sides";
}

export const UNITS = [
  { value: "each", label: "each (1 piece)" },
  { value: "lb", label: "pound (lb)" },
  { value: "oz", label: "ounce (oz)" },
  { value: "pt", label: "pint (pt)" },
  { value: "qt", label: "quart (qt)" },
  { value: "gal", label: "gallon (gal)" },
  { value: "portion", label: "portion" },
  { value: "batch", label: "batch" },
  { value: "pan", label: "pan" },
  { value: "cs", label: "case" },
  { value: "dz", label: "dozen" },
  { value: "loaf", label: "loaf" },
  { value: "keg", label: "keg" },
  { value: "jar", label: "jar" },
  { value: "roll", label: "roll" },
] as const;

const UNIT_LABELS: Record<string, string> = {
  ea: "each",
  each: "each",
  lb: "lb",
  oz: "oz",
  pt: "pint",
  qt: "quart",
  gal: "gallon",
  portion: "portion",
  batch: "batch",
  pan: "pan",
  cs: "case",
  dz: "dozen",
  loaf: "loaf",
  keg: "keg",
  jar: "jar",
  roll: "roll",
};

export function itemVendor(item: { vendor?: string }) {
  return item.vendor?.trim() || UNASSIGNED_VENDOR;
}

export function vendorsFrom(items: { vendor?: string }[]) {
  const found = new Set(items.map((item) => itemVendor(item)));
  const known = VENDORS.filter((vendor) => found.has(vendor));
  const extra = [...found]
    .filter((vendor) => !VENDORS.includes(vendor as VendorName) && vendor !== UNASSIGNED_VENDOR)
    .sort((a, b) => a.localeCompare(b));
  const unassigned = found.has(UNASSIGNED_VENDOR) ? [UNASSIGNED_VENDOR] : [];
  return [...known, ...extra, ...unassigned];
}

export function cityProduceSection(name: string) {
  const n = name.toLowerCase();
  if (/lemon|lime|orange|mango/.test(n)) return "Bar cooler";
  if (/strawberr|blueberr/.test(n)) return "Brunch cooler";
  if (/parmesan|cheese|cheddar|feta|gouda|brie|swiss|mozzarella|monterey|american|pimento|bleu|goat/.test(n)) {
    return "Brunch cooler";
  }
  return "Walk-in";
}

function nameRank(name: string, lead: readonly string[]) {
  const index = lead.findIndex((entry) => entry.toLowerCase() === name.toLowerCase());
  return index === -1 ? 100 : index;
}

export function sortCityProduce<T extends { name: string; category?: string }>(rows: T[]) {
  return [...rows].sort((a, b) => {
    const sa = PRODUCE_SECTIONS.indexOf(a.category as (typeof PRODUCE_SECTIONS)[number]);
    const sb = PRODUCE_SECTIONS.indexOf(b.category as (typeof PRODUCE_SECTIONS)[number]);
    const ia = sa === -1 ? 99 : sa;
    const ib = sb === -1 ? 99 : sb;
    if (ia !== ib) return ia - ib;
    const lead =
      (a.category || "Walk-in") === "Walk-in"
        ? WALK_IN_LEAD
        : a.category === "Brunch cooler"
          ? BRUNCH_LEAD
          : a.category === "Bar cooler"
            ? BAR_LEAD
            : null;
    if (lead) {
      const ga = nameRank(a.name, lead);
      const gb = nameRank(b.name, lead);
      if (ga !== gb) return ga - gb;
    }
    return a.name.localeCompare(b.name);
  });
}

export function compareOrderingItems(
  a: { name: string; category: string; vendor?: string },
  b: { name: string; category: string; vendor?: string }
) {
  const vendorOrder = new Map<string, number>(VENDORS.map((vendor, index) => [vendor, index]));
  const va = itemVendor(a);
  const vb = itemVendor(b);
  const ia = vendorOrder.has(va) ? vendorOrder.get(va)! : 80;
  const ib = vendorOrder.has(vb) ? vendorOrder.get(vb)! : 80;
  if (ia !== ib) return ia - ib;
  if (va === CITY_PRODUCE || vb === CITY_PRODUCE) {
    if (va !== vb) return va.localeCompare(vb);
    const sorted = sortCityProduce([a, b]);
    if (sorted[0] === a && sorted[1] === b) {
      const swapped = sortCityProduce([b, a]);
      return swapped[0] === b ? 0 : -1;
    }
    return 1;
  }
  return a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
}

export function groupByVendor<T extends { vendor?: string; name?: string; category?: string }>(rows: T[]) {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const vendor = itemVendor(row);
    const list = groups.get(vendor) || [];
    list.push(row);
    groups.set(vendor, list);
  }
  return vendorsFrom(rows)
    .map((vendor) => {
      const list = groups.get(vendor) || [];
      const rowsForVendor =
        vendor === CITY_PRODUCE ? sortCityProduce(list as (T & { name: string; category?: string })[]) : list;
      return { vendor, rows: rowsForVendor };
    })
    .filter((group) => group.rows.length > 0);
}

export function groupByCategory<T extends { category: string }>(rows: T[], order: readonly string[]) {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const key = row.category?.trim() || "Other";
    const list = groups.get(key) || [];
    list.push(row);
    groups.set(key, list);
  }
  const extras = [...groups.keys()].filter((name) => !order.includes(name)).sort((a, b) => a.localeCompare(b));
  return [...order, ...extras]
    .filter((name) => groups.has(name))
    .map((name) => ({ vendor: name, rows: groups.get(name) || [] }));
}

export function categoriesFor(type: ItemType, vendor?: string): string[] {
  if (type === "ordering" && vendor === CITY_PRODUCE) return [...PRODUCE_SECTIONS];
  if (type === "ordering") return [...ORDERING_CATEGORIES];
  if (type === "pull") return [...PULL_CATEGORIES];
  return [...PREP_CATEGORIES];
}

export function unitLabel(unit: string) {
  return UNIT_LABELS[unit] || unit;
}

export function normalizeUnit(unit: string) {
  const trimmed = unit.trim().toLowerCase();
  if (trimmed === "ea") return "each";
  return trimmed || "each";
}
