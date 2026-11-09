export type ItemType = "prep" | "ordering" | "pull";
export type Shift = "day" | "night";

export function parseItemType(value: unknown, fallback: ItemType = "prep"): ItemType {
  if (value === "prep" || value === "ordering" || value === "pull") return value;
  return fallback;
}

export function sheetLabel(type: ItemType | string) {
  if (type === "pull") return "Pull inventory";
  if (type === "ordering") return "Ordering";
  return "Prep inventory";
}

export interface InventoryItem {
  id: string;
  type: ItemType;
  name: string;
  category: string;
  unit: string;
  par: number;
  vendor?: string;
  createdAt: string;
  lastOnHand?: number;
  lastMadeToday?: number;
  lastOrderQty?: number;
  lastSavedAt?: string;
}

export interface ReportLine {
  itemId: string;
  name: string;
  category: string;
  unit: string;
  par: number;
  vendor?: string;
  onHand: string | number;
  madeToday?: string | number;
  orderQty?: string | number;
  overParReason?: string;
}

export interface Report {
  id: string;
  type: ItemType;
  date: string;
  submittedAt: string;
  submittedBy: string;
  emailed: boolean;
  emailError?: string;
  status?: "sent";
  shift?: Shift;
  reopened?: boolean;
  lines: ReportLine[];
}

export interface DraftSheet {
  id: string;
  type: ItemType;
  date: string;
  updatedAt: string;
  submittedBy: string;
  status: "draft";
  shift?: Shift;
  lines: ReportLine[];
}

export interface RecipeIngredient {
  amount: string;
  item: string;
}

export interface Recipe {
  id: string;
  name: string;
  category: string;
  yield: string;
  prepTime: string;
  description: string;
  ingredients: RecipeIngredient[];
  instructions: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type PriceDirection = "up" | "down" | "new" | "removed";

export interface VendorSetting {
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  uploadToken: string;
}

export interface VendorPriceLine {
  name: string;
  unit?: string;
  sku?: string;
  price: number;
  itemId?: string;
}

export interface VendorPriceList {
  id: string;
  vendor: string;
  month: string;
  uploadedAt: string;
  uploadedBy: string;
  fileName: string;
  lines: VendorPriceLine[];
}

export interface PriceChange {
  name: string;
  vendor: string;
  itemId?: string;
  previousPrice: number | null;
  currentPrice: number | null;
  direction: PriceDirection;
}

export interface PriceRecord {
  id: string;
  createdAt: string;
  month: string;
  vendor: string;
  uploadedBy: string;
  fileName: string;
  changes: PriceChange[];
  snapshot: VendorPriceLine[];
}

export interface PriceSignal {
  current: number;
  previous: number | null;
  direction: "up" | "down" | "same" | null;
}

export interface Database {
  items: InventoryItem[];
  reports: Report[];
  drafts: DraftSheet[];
  recipes: Recipe[];
  vendorSettings?: VendorSetting[];
  priceLists?: VendorPriceList[];
  priceRecords?: PriceRecord[];
}
