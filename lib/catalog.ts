import type { ItemType } from "./types";

export const PREP_CATEGORIES = [
  "Soups & Sauces",
  "Seafood Prep",
  "Dips & Spreads",
  "Dressings",
  "Sides Prep",
  "Breads & Batter",
  "Desserts",
  "Brunch",
] as const;

export const ORDERING_CATEGORIES = [
  "Seafood",
  "Beef & Pork",
  "Poultry",
  "Produce",
  "Dairy & Eggs",
  "Dry Goods",
  "Bread & Bakery",
] as const;

export const RECIPE_CATEGORIES = [
  "Soups",
  "Sauces",
  "Seafood",
  "Appetizers",
  "Sides",
  "Entrees",
  "Desserts",
  "Spreads",
  "House",
] as const;

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
};

export function categoriesFor(type: ItemType): string[] {
  return type === "ordering" ? [...ORDERING_CATEGORIES] : [...PREP_CATEGORIES];
}

export function unitLabel(unit: string) {
  return UNIT_LABELS[unit] || unit;
}

export function normalizeUnit(unit: string) {
  const trimmed = unit.trim().toLowerCase();
  if (trimmed === "ea") return "each";
  return trimmed || "each";
}
